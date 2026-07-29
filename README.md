# MedNexus API Server

A Cloudflare Workers-based API server with AI-powered features and self-contained terminal functionality. This server runs on the edge using Hono and D1 (SQLite).

## Features

### Core API
- **Authentication**: Session-based auth with guest access support
- **Deck Management**: Create, read, update, delete, merge, and export decks
- **Card Management**: CRUD operations for flashcards with batch regeneration
- **Health Checks**: Comprehensive health monitoring endpoints

### Self-Contained Terminal
- **Terminal Sessions**: Create isolated terminal sessions
- **Command Execution**: Execute shell commands in sandboxed workspaces
- **File Management**: Read, write, and list files within workspaces
- **Security**: Blocked dangerous commands, workspace isolation

### AI-Ready Architecture
- **Multi-Provider Support**: OpenRouter, OpenAI, Groq, Ollama
- **Configurable Models**: Separate models for text, vision, Q&A
- **Streaming Support**: Server-Sent Events for real-time responses

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Language**: TypeScript
- **Framework**: Hono
- **Database**: D1 (SQLite via Drizzle ORM)
- **Validation**: Zod
- **Build Tool**: Vite with @cloudflare/vite-plugin
- **CLI**: Wrangler

## Project Structure

```
├── src/
│   ├── worker.ts              # Entry point
│   ├── types.ts               # Type definitions
│   ├── db/
│   │   ├── index.ts           # Database connection
│   │   └── schema.ts          # Database schema
│   ├── lib/
│   │   ├── auth.ts            # Authentication utilities
│   │   ├── config.ts          # Configuration management
│   │   ├── logger.ts          # Logging setup
│   │   └── ai.ts              # AI utilities
│   ├── middleware/
│   │   └── validate.ts        # Request validation
│   └── routes/
│       ├── auth.ts            # Auth routes
│       ├── decks.ts           # Deck CRUD routes
│       ├── cards.ts           # Card CRUD routes
│       ├── health.ts          # Health check routes
│       └── terminal.ts        # Terminal routes
├── public/                    # Static assets
├── migrations/                # D1 migrations
├── wrangler.jsonc             # Wrangler configuration
├── vite.config.ts             # Vite configuration
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or pnpm
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account
- ngrok CLI (`npm install -g ngrok`)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mednexus-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure secrets**
   ```bash
   wrangler secret put OPENROUTER_API_KEY
   wrangler secret put OPENAI_API_KEY
   wrangler secret put GROQ_API_KEY
   wrangler secret put OLLAMA_CLOUD_API_KEY
   wrangler secret put MISTRAL_API_KEY
   wrangler secret put GOOGLE_AI_API_KEY
   wrangler secret put ADMIN_SECRET_KEY
   ```

4. **Run in development mode**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

6. **Deploy**
   ```bash
   npm run deploy
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `FREE_MAX_DECKS` | Free tier deck limit | `100` |
| `FREE_MAX_CARDS_PER_DECK` | Free tier card limit per deck | `200` |
| `APP_URL` | Application URL | `https://mednexus.fit` |
| `LOCAL_AI_URL` | Local AI server URL | `https://ai.mednexus.fit/v1` |
| `AI_TEXT_MODEL` | Model for text generation | `local/qwen/qwen3.5-4b` |
| `AI_VISION_MODEL` | Model for vision tasks | `local/qwen/qwen3.5-4b` |
| `AI_QBANK_MODEL` | Model for Q&A | `local/qwen/qwen3.5-4b` |
| `AI_EXPLAIN_MODEL` | Model for explanations | `local/qwen/qwen3.5-4b` |
| `STUDY_BUDDY_MODEL` | Model for StudyPilot | `local/qwen/qwen3.5-4b` |

## API Endpoints

### Authentication
- `POST /api/auth/guest` - Create guest session
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/register` - Register new user
- `POST /api/auth/logout` - Logout
- `GET /api/auth/user` - Get current user

### Decks
- `GET /api/decks` - List all decks
- `POST /api/decks` - Create new deck
- `GET /api/decks/:id` - Get deck details
- `PATCH /api/decks/:id` - Update deck
- `DELETE /api/decks/:id` - Delete deck
- `GET /api/decks/:id/cards` - Get deck cards
- `GET /api/decks/:id/export` - Export deck as CSV
- `POST /api/decks/merge` - Merge multiple decks

### Cards
- `GET /api/cards?deckId=:id` - Get cards by deck
- `POST /api/cards` - Create new card
- `PATCH /api/cards/:id` - Update card
- `DELETE /api/cards/:id` - Delete card
- `POST /api/cards/regenerate-batch` - Batch regenerate with AI

### Terminal
- `POST /api/terminal/sessions` - Create terminal session
- `GET /api/terminal/sessions/:id` - Get session info
- `POST /api/terminal/exec` - Execute command
- `GET /api/terminal/files` - List files
- `GET /api/terminal/files/content` - Read file
- `POST /api/terminal/files/content` - Write file
- `DELETE /api/terminal/sessions/:id` - Close session

### Health
- `GET /healthz` - Basic health check
- `GET /api/health` - Detailed health check
- `GET /api/model-info` - AI model configuration

## Development

### Running Locally

```bash
# Start development server
npm run dev

# Run type checking
npm run typecheck

# Run migrations
npm run migrate:generate
npm run migrate:apply:local
```

### Tunnel Setup (for LM Studio)

The project uses ngrok to expose your local LM Studio instance to Cloudflare Workers.

1. **Ensure LM Studio is running** and serving its OpenAI-compatible `/v1` API at `http://192.168.100.99:1234`

2. **Start the tunnel** (automatically installs ngrok if not found):
   ```bash
   npm run tunnel
   ```

   To skip ngrok and use direct connection (for local development or when ngrok is not needed):
   ```bash
   npm run tunnel:skip-ngrok
   # Or: SKIP_NGROK=1 npm run tunnel
   ```

   To skip both ngrok and database tunnel (use local PostgreSQL, no Docker):
   ```bash
   npm run tunnel:local-db
   # Or: SKIP_NGROK=1 SKIP_DB_TUNNEL=1 npm run tunnel
   ```

3. The script will:
   - Start an ngrok tunnel pointing to your LM Studio server
   - Update `wrangler.jsonc` with the tunnel URL
   - Apply D1 migrations to the remote database
   - Deploy the worker

4. **Environment Variables**:
   | Variable | Description | Default |
   |----------|-------------|---------|
   | `TUNNEL_TARGET` | Override LM Studio URL | `http://192.168.100.99:1234` |
   | `SKIP_DEPLOY` | Skip worker deployment | - |
   | `SKIP_MIGRATE` | Skip database migrations | - |
   | `SKIP_NGROK` | Skip ngrok tunnel (use direct connection) | - |
   | `SKIP_DB_TUNNEL` | Skip database tunnel setup | - |

### Testing

```bash
# Run tests
npm test
```

## Security Features

- Session-based authentication with HTTP-only cookies
- Input validation with Zod
- Admin key required for admin endpoints
- Workspace isolation for terminal sessions
- Command injection prevention in terminal
- Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)

## License

MIT