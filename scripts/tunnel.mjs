import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const wranglerPath = resolve(root, "wrangler.jsonc");
const tunnelStatePath = resolve(root, ".tunnel-state.json");

const LM_STUDIO_HOST = "http://192.168.100.99:1234";
const DB_HOST = "localhost";
const DB_PORT = "5432";
const DB_NAME = "mednexus_local";
const DB_USER = "mednexus";
const DB_PASS = "mednexus";

const AUTO_DEPLOY = !process.env.SKIP_DEPLOY && !process.argv.includes("--no-deploy");
const AUTO_MIGRATE = !process.env.SKIP_MIGRATE && !process.argv.includes("--no-migrate");
const SKIP_NGROK = process.env.SKIP_NGROK === "1" || process.argv.includes("--skip-ngrok");
const SKIP_DB_TUNNEL = process.env.SKIP_DB_TUNNEL === "1" || process.argv.includes("--skip-db-tunnel");

const tunnelState = safeReadJson(tunnelStatePath);
const LOCAL_TARGET =
  process.env.TUNNEL_TARGET ||
  tunnelState?.target ||
  LM_STUDIO_HOST;

function safeReadJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

const log = (m) => console.log(m);

function resolveNgrok() {
  for (const p of ["ngrok", `${homedir()}/.local/bin/ngrok`, "/usr/local/bin/ngrok", "/usr/bin/ngrok"]) {
    try {
      spawnSync(p, ["version"], { stdio: "ignore" });
      return p;
    } catch {
      /* try next */
    }
  }
  return null;
}

function installNgrok() {
  const dest = `${homedir()}/.local/bin/ngrok`;
  log("⬇ Installing ngrok to ~/.local/bin/ngrok ...");
  spawnSync("mkdir", ["-p", `${homedir()}/.local/bin`]);
  const url = "https://bin.equinox.io/c/bNyj1m1r5gY/ngrok-v3-stable-linux-amd64.tgz";
  const r = spawnSync("curl", ["-sL", url, "-o", "/tmp/ngrok.tgz"], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("ngrok download failed");
  spawnSync("tar", ["-xzf", "/tmp/ngrok.tgz", "-C", "/tmp"], { stdio: "inherit" });
  spawnSync("mv", ["/tmp/ngrok", dest], { stdio: "inherit" });
  spawnSync("chmod", ["+x", dest], { stdio: "inherit" });
  log("✅ ngrok installed.");
  return dest;
}

function updateWrangler(aiUrl, dbUrl) {
  let content;
  try {
    content = readFileSync(wranglerPath, "utf8");
  } catch {
    return;
  }

  const newAiUrl = aiUrl.replace(/\/$/, "").replace(/\/v1\/?$/, "").replace(/\/+$/, "") + "/v1";
  const newDbUrl = `postgresql://${DB_USER}:${DB_PASS}@${dbUrl.replace(/\/$/, "")}:${DB_PORT}/${DB_NAME}`;

  const aiRe = /"LOCAL_AI_URL"\s*:\s*"[^"]*"/;
  if (aiRe.test(content)) {
    content = content.replace(aiRe, `"LOCAL_AI_URL": "${newAiUrl}"`);
  }

  const dbRe = /"localConnectionString"\s*:\s*"[^"]*"/;
  if (dbRe.test(content)) {
    content = content.replace(dbRe, `"localConnectionString": "${newDbUrl}"`);
  }

  writeFileSync(wranglerPath, content);
  return { aiUrl: newAiUrl, dbUrl: newDbUrl };
}

function persistTunnelState(aiUrl, dbUrl, extra = {}) {
  const state = {
    ...tunnelState,
    ...extra,
    aiTunnelUrl: aiUrl,
    dbTunnelUrl: dbUrl,
    target: LOCAL_TARGET,
    lastUpdated: new Date().toISOString(),
  };
  try {
    writeFileSync(tunnelStatePath, JSON.stringify(state, null, 2) + "\n");
  } catch {
    /* non-fatal */
  }
}

function wranglerEnv() {
  const e = { ...process.env };
  delete e.CLOUDFLARE_API_TOKEN;
  delete e.CF_API_TOKEN;
  delete e.CLOUDFLARE_API_KEY;
  delete e.CLOUDFLARE_EMAIL;
  return e;
}

function wranglerAuthenticated() {
  const r = spawnSync("npx", ["wrangler", "whoami"], { stdio: ["ignore", "pipe", "pipe"], cwd: root, env: wranglerEnv() });
  return r.status === 0;
}

function applyMigrations() {
  log("🗄  Applying D1 migrations to remote database (idempotent)...");
  const r = spawnSync(
    "npx",
    ["wrangler", "d1", "migrations", "apply", "mednexus-db", "--remote"],
    { stdio: "inherit", cwd: root, env: wranglerEnv(), timeout: 120000 }
  );
  if (r.status !== 0) {
    log("⚠ Migrations failed or were skipped. The worker may not have its schema yet.");
    return false;
  }
  return true;
}

function deploy() {
  log("🚀 Deploying worker to pick up the new tunnel urls (npm run deploy)...");
  const r = spawnSync("npm", ["run", "deploy"], { stdio: "inherit", cwd: root, env: wranglerEnv(), timeout: 300000 });
  if (r.status !== 0) {
    log("\n⚠ Deploy failed. After `npx wrangler login`, re-run: npm run tunnel\n");
  }
}

function getNgrokTunnelUrl() {
  try {
    const r = spawnSync("curl", ["-s", "http://127.0.0.1:4040/api/tunnels"], { stdio: ["ignore", "pipe", "pipe"] });
    if (r.status === 0) {
      const data = JSON.parse(r.stdout.toString());
      if (data.tunnels && data.tunnels.length > 0) {
        const tunnel = data.tunnels.find(t => t.public_url && t.public_url.includes("http"));
        if (tunnel) return tunnel.public_url;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function waitForNgrok(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const url = getNgrokTunnelUrl();
    if (url) return url;
    spawnSync("sleep", ["0.5"], { stdio: "ignore" });
  }
  return null;
}

function startNgrokTunnel(ngrok) {
  log(`▶ Starting ngrok tunnel -> ${LOCAL_TARGET} (LM Studio AI)`);
  const child = spawn(
    ngrok,
    ["http", LOCAL_TARGET, "--log", "stdout"],
    { stdio: ["ignore", "pipe", "pipe"], env: process.env }
  );
  return child;
}

function checkDbRunning() {
  try {
    const r = spawnSync("pg_isready", ["-h", DB_HOST, "-p", DB_PORT, "-U", DB_USER], { stdio: "ignore" });
    return r.status === 0;
  } catch {
    return false;
  }
}

function checkDockerRunning() {
  try {
    const r = spawnSync("docker", ["ps"], { stdio: "ignore" });
    return r.status === 0;
  } catch {
    return false;
  }
}

function startDocker() {
  log("🚀 Starting Docker containers...");
  try {
    const result = spawnSync("docker", ["compose", "up", "-d"], { 
      cwd: root, 
      stdio: "inherit", 
      shell: true 
    });
    if (result.status === 0) {
      log("✅ Docker containers started");
      return true;
    }
  } catch (err) {
    log("⚠ Failed to start Docker:", err.message);
  }
  
  try {
    const result = spawnSync("docker-compose", ["up", "-d"], { 
      cwd: root, 
      stdio: "inherit", 
      shell: true 
    });
    if (result.status === 0) {
      log("✅ Docker containers started (via docker-compose)");
      return true;
    }
  } catch (err) {
    log("⚠ Failed to start Docker containers:", err.message);
  }
  
  return false;
}

function createDbTunnel() {
  log("Creating Cloudflare Tunnel for database...");
  
  const createResult = spawnSync("npx", ["wrangler", "tunnel", "create", "db-tunnel"], { 
    stdio: "pipe",
    cwd: root,
    env: wranglerEnv()
  });
  
  if (createResult.status === 0) {
    log("✅ Database tunnel 'db-tunnel' created");
  }
  
  return createResult.status === 0;
}

function startDbTunnel() {
  log("▶ Starting Cloudflare Tunnel for database -> localhost:5432");
  const child = spawn(
    "npx",
    ["wrangler", "tunnel", "run", "db-tunnel"],
    { stdio: ["pipe", "pipe", "pipe"], cwd: root, env: wranglerEnv() }
  );
  return child;
}

function setupDbTunnelConfig() {
  log("Setting up tunnel configuration...");
  const cloudflaredDir = resolve(homedir(), ".cloudflared");
  mkdirSync(cloudflaredDir, { recursive: true });
  
  const config = `tunnel: db-tunnel
credentials-file: ~/.cloudflared/db-tunnel.json

ingress:
  - service: tcp://localhost:5432
  - service: http_status:404
`;
  
  writeFileSync(resolve(cloudflaredDir, "config.yml"), config);
  log("✅ Tunnel config written to ~/.cloudflared/config.yml");
}

function onTunnelUp(aiUrl, dbUrl) {
  const result = updateWrangler(aiUrl, dbUrl);
  persistTunnelState(result.aiUrl, result.dbUrl);
  log(`✅ AI Tunnel live:   ${aiUrl}`);
  log(`✅ DB Tunnel live:   ${dbUrl}`);
  log(`✅ wrangler.jsonc updated:`);
  log(`   LOCAL_AI_URL = ${result.aiUrl}`);
  log(`   LOCAL_DB connection = ${result.dbUrl}`);
  log(`✅ Worker deployed to: https://mednexus.fit`);
  log(`   Route: https://api.mednexus.fit`);
  log(`ℹ Note: Routes mednexus.fit and api.mednexus.fit must be configured in Cloudflare Dashboard → Workers → Routes`);

  if (!AUTO_MIGRATE) {
    log("   (migrations skipped — set SKIP_MIGRATE=1)");
  } else {
    applyMigrations();
  }

  if (!AUTO_DEPLOY) {
    log("   (deploy skipped — run: npm run deploy)\n");
    return;
  }
  if (wranglerAuthenticated()) {
    applyMigrations();
    deploy();
  } else {
    log("\nℹ Worker not authenticated. After `npx wrangler login`, re-run: npm run tunnel\n");
  }
}

function printDbTunnelInstructions() {
  log(`
🔧 Database Tunnel Setup Instructions:
   ======================================
   1. Start PostgreSQL:  docker compose up -d
   2. Create tunnel:    npx wrangler tunnel create db-tunnel
   3. Run tunnel:       npx wrangler tunnel run db-tunnel
   4. Create VPC Service in Cloudflare Dashboard:
      Workers → VPC → Services → Create
      - Name: db-service
      - Tunnel: db-tunnel
      - Host: localhost
      - Port: 5432
      - Protocol: PostgreSQL
   5. Create Hyperdrive:
      npx wrangler hyperdrive create mednexus-hyperdrive \
        --service-id <VPC_SERVICE_ID> \
        --database mednexus \
        --user ${DB_USER} \
        --password ${DB_PASS}
`);
}

let ngrok = null;
let ngrokChild = null;

if (!SKIP_NGROK) {
  ngrok = resolveNgrok();
  if (!ngrok) ngrok = installNgrok();

  try {
    spawnSync("pkill", ["-f", "ngrok"], { stdio: "ignore" });
  } catch {
    /* none */
  }

  ngrokChild = startNgrokTunnel(ngrok);
  if (!ngrokChild) {
    log("❌ Could not start ngrok tunnel. Is ngrok installed?");
    process.exit(1);
  }

  ngrokChild.stdout.on("data", (d) => {
    const s = d.toString();
    process.stdout.write(s);
  });

  ngrokChild.stderr.on("data", (d) => {
    process.stderr.write(d.toString());
  });
} else {
  log("⏭ Skipping ngrok tunnel (SKIP_NGROK=1)");
}

setTimeout(async () => {
  let aiUrl = null;
  
  if (!SKIP_NGROK) {
    aiUrl = waitForNgrok();
    
    if (!aiUrl) {
      log("⚠ Could not get AI tunnel URL from ngrok API.");
    }
  } else {
    log("⏭ Using direct LM Studio URL (ngrok skipped)");
    aiUrl = LOCAL_TARGET;
  }

  let dbUrl = "localhost";
  
  if (checkDbRunning()) {
    log("✅ PostgreSQL database is running locally");
  } else if (checkDockerRunning()) {
    log("⚠ PostgreSQL database is not running locally");
    log("   Starting Docker containers...");
    startDocker();
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (checkDbRunning()) {
      log("✅ PostgreSQL database started via Docker");
    } else if (SKIP_DB_TUNNEL) {
      log("⚠ Could not start PostgreSQL (SKIP_DB_TUNNEL=1)");
      log("   You need to run PostgreSQL locally or use Docker.");
      log("   Example: docker run -d -p 5432:5432 -e POSTGRES_USER=mednexus -e POSTGRES_PASSWORD=mednexus -e POSTGRES_DB=mednexus_local postgres:16-alpine");
      dbUrl = "localhost";
    } else {
      log("⚠ Could not start PostgreSQL. Setting up tunnel...");
      setupDbTunnelConfig();
      createDbTunnel();
      startDbTunnel();
      dbUrl = "localhost";
    }
  } else if (SKIP_DB_TUNNEL) {
    log("⚠ Docker not available (SKIP_DB_TUNNEL=1)");
    log("   You need to run PostgreSQL locally or use Docker.");
    log("   Example: docker run -d -p 5432:5432 -e POSTGRES_USER=mednexus -e POSTGRES_PASSWORD=mednexus -e POSTGRES_DB=mednexus_local postgres:16-alpine");
    dbUrl = "localhost";
  } else {
    log("⚠ Docker not available. Setting up tunnel for database...");
    setupDbTunnelConfig();
    createDbTunnel();
    startDbTunnel();
    dbUrl = "localhost";
  }

  if (aiUrl) {
    onTunnelUp(aiUrl, dbUrl);
  }
}, SKIP_NGROK ? 1000 : 4000);

process.on("SIGINT", () => {
  if (ngrokChild) ngrokChild.kill("SIGINT");
});
process.on("SIGTERM", () => {
  if (ngrokChild) ngrokChild.kill("SIGTERM");
});