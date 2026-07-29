# Dual Tunnel Setup (AI + Database)

This document explains how to set up dual tunnels for:
1. **AI Service** (LM Studio) - via ngrok
2. **Database** (PostgreSQL) - via Cloudflare Tunnel

## Quick Start (Local Development with D1)

For local development, use D1 which works automatically:

```bash
# Start local development server
npm run dev

# Apply migrations locally (if needed)
npm run migrate:apply:local
```

D1 creates a local SQLite database at `.wrangler/state/d1/mednexus-db.sqlite`

## Option 2: PostgreSQL via Docker + Cloudflare Tunnel

### Prerequisites
- Docker installed
- Cloudflare account with Workers access
- `npx wrangler login` completed

### Installing Docker (if not installed)

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Or install latest Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### Starting PostgreSQL

```bash
# Start PostgreSQL via Docker
docker compose up -d

# Or with docker-compose (older versions)
docker-compose up -d

# Verify it's running
docker ps

# Initialize the database
docker exec -i mednexus-postgres psql -U mednexus -d mednexus_local < docker-init.sql
```

### Alternative: Local PostgreSQL Installation

If Docker is not available, install PostgreSQL locally:

```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# Create user and database
sudo -u postgres psql -c "CREATE USER mednexus WITH PASSWORD 'mednexus';"
sudo -u postgres psql -c "CREATE DATABASE mednexus_local OWNER mednexus;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE mednexus_local TO mednexus;"

# Apply schema
psql -U mednexus -d mednexus_local < docker-init.sql
```

### Step 2: Create Cloudflare Tunnel for Database

```bash
# Create the tunnel
npx wrangler tunnel create db-tunnel

# Create tunnel config
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: db-tunnel
credentials-file: ~/.cloudflared/db-tunnel.json

ingress:
  - hostname: db.mednexus.trycloudflare.com
    service: tcp://localhost:5432
  - service: http_status:404
EOF
```

### Step 3: Create VPC Service and Hyperdrive

```bash
# Run the tunnel
npx wrangler tunnel run db-tunnel

# In another terminal, create VPC Service:
npx wrangler vpc service create db-service \
  --type tcp \
  --tcp-port 5432 \
  --app-protocol postgresql \
  --tunnel-id <TUNNEL_ID> \
  --ipv4 localhost

# Create Hyperdrive binding:
npx wrangler hyperdrive create mednexus-hyperdrive \
  --service-id <VPC_SERVICE_ID> \
  --database mednexus \
  --user mednexus \
  --password mednexus
```

### Step 4: Update wrangler.jsonc

After creating Hyperdrive, update the binding with the actual ID:

```jsonc
{
  "hyperdrive": [
    {
      "binding": "LOCAL_DB",
      "id": "your-hyperdrive-id-here",
      "localConnectionString": "postgresql://mednexus:mednexus@localhost:5432/mednexus_local"
    }
  ]
}
```

### Step 5: Update Worker to Use Local DB

Modify `src/worker.ts` to use the Hyperdrive connection:

```typescript
app.use("*", async (c, next) => {
  // Use LOCAL_DB binding (Hyperdrive) for development
  const db = c.env.LOCAL_DB || c.env.DB;
  c.set("db", createDb(db as any));
  c.set("flashcardDb", createFlashcardDb(db as any));
  c.set("studypilotDb", createStudyPilotDb(db as any));
  await next();
});
```

### Step 6: Run the Tunnel Script

```bash
# Start both tunnels (AI + Database)
npm run tunnel
```

## Tunnel Script Commands

The `npm run tunnel` script:
1. Starts ngrok tunnel for LM Studio AI
2. Starts/creates Cloudflare Tunnel for PostgreSQL
3. Updates wrangler.jsonc with tunnel URLs
4. Applies migrations and deploys

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LM_STUDIO_HOST` | LM Studio API endpoint | `http://192.168.100.99:1234` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `mednexus_local` |
| `DB_USER` | Database user | `mednexus` |
| `DB_PASS` | Database password | `mednexus` |

## Troubleshooting

### AI Generation Works, Save Fails

Check if:
1. Database is running: `docker ps`
2. Database connection works: `docker exec -it mednexus-postgres psql -U mednexus -d mednexus_local`
3. Migrations applied: `npm run migrate:apply:local`

### Tunnel Connection Issues

1. Check tunnel status: `npx wrangler tunnel list`
2. View tunnel logs: `npx wrangler tunnel run db-tunnel --log-level debug`
3. Test connection: `psql "postgresql://mednexus:mednexus@localhost:5432/mednexus_local"`

### D1 vs PostgreSQL

- **D1**: Serverless SQLite, works everywhere, no setup needed
- **PostgreSQL**: Full-featured, requires tunnel setup, better for production-like dev

## Architecture

```
                    ┌─────────────────┐
                    │   Frontend      │
                    │   (Vite)        │
                    └────────┬────────┘
                             │ HTTP
                    ┌────────▼────────┐
                    │   Worker        │
                    │   (Hono)        │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼──┐  ┌───────▼───────┐  ┌───▼─────────┐
    │   D1 DB    │  │  Hyperdrive   │  │  KV/R2/etc │
    │ (SQLite)   │  │ (PostgreSQL)  │  │             │
    └────────────┘  └───────┬───────┘  └─────────────┘
                            │
                    ┌───────▼───────┐
                    │  Tunnel       │
                    │  (Cloudflare) │
                    └───────┬───────┘
                            │ TCP
                    ┌───────▼───────┐
                    │  Postgres     │
                    │  (Docker)     │
                    └───────────────┘
```