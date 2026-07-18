import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const wranglerPath = resolve(root, "wrangler.toml");
const tunnelStatePath = resolve(root, ".tunnel-state.json");

// ── Local server that should be exposed (LM Studio OpenAI-compatible /v1 API) ──
// Prefer the target stored in .tunnel-state.json, then TUNNEL_TARGET env,
// then the known LM Studio host, and finally localhost.
const tunnelState = safeReadJson(tunnelStatePath);
const LM_STUDIO_HOST = "http://192.168.100.205:1234";
const LOCAL_TARGET =
  process.env.TUNNEL_TARGET ||
  tunnelState?.target ||
  LM_STUDIO_HOST;

// Deploy the worker after the tunnel is up (unless --no-deploy / SKIP_DEPLOY).
const AUTO_DEPLOY = !process.env.SKIP_DEPLOY && !process.argv.includes("--no-deploy");
// Apply D1 migrations to the remote DB before deploy (safe to run repeatedly;
// wrangler skips already-applied migrations). Set SKIP_MIGRATE=1 to skip.
const AUTO_MIGRATE = !process.env.SKIP_MIGRATE && !process.argv.includes("--no-migrate");

// Load a local .env (gitignored) if present — only used for `wrangler deploy` creds.
loadDotenv();
function loadDotenv() {
  const p = resolve(root, ".env");
  try {
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* no .env */
  }
}

function safeReadJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

const log = (m) => console.log(m);

function resolveCloudflared() {
  for (const p of ["cloudflared", `${homedir()}/.local/bin/cloudflared`, "/usr/local/bin/cloudflared"]) {
    try {
      spawnSync(p, ["--version"], { stdio: "ignore" });
      return p;
    } catch {
      /* try next */
    }
  }
  return null;
}

function installCloudflared() {
  const dest = `${homedir()}/.local/bin/cloudflared`;
  log("⬇ Installing cloudflared to ~/.local/bin/cloudflared ...");
  spawnSync("mkdir", ["-p", `${homedir()}/.local/bin`]);
  const arch = process.arch === "arm64" ? "arm64" : "amd64";
  const url = `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${arch}`;
  const r = spawnSync("curl", ["-sL", url, "-o", dest], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("cloudflared download failed");
  spawnSync("chmod", ["+x", dest]);
  log("✅ cloudflared installed.");
  return dest;
}

// Update wrangler.toml's LOCAL_AI_URL. Tolerant of the key being absent
// (appends a [vars] entry) or present (replaces in place).
function updateWrangler(tunnelUrl) {
  const newUrl = `${tunnelUrl}/v1`;
  let content = readFileSync(wranglerPath, "utf8");
  const re = /^LOCAL_AI_URL\s*=\s*"[^"]*"/m;
  if (re.test(content)) {
    content = content.replace(re, `LOCAL_AI_URL = "${newUrl}"`);
  } else if (/\[vars\]/.test(content)) {
    content = content.replace(/\[vars\]/, `[vars]\nLOCAL_AI_URL = "${newUrl}"`);
  } else {
    content += `\n[vars]\nLOCAL_AI_URL = "${newUrl}"\n`;
  }
  writeFileSync(wranglerPath, content);
  return newUrl;
}

function persistTunnelState(tunnelUrl) {
  const state = {
    ...(tunnelState || {}),
    subdomain: tunnelUrl,
    target: LOCAL_TARGET,
    lastUpdated: new Date().toISOString(),
  };
  try {
    writeFileSync(tunnelStatePath, JSON.stringify(state, null, 2) + "\n");
  } catch {
    /* non-fatal */
  }
}

// For the deploy step, strip the scoped tunnel token (no Worker perms) so wrangler
// falls back to the Global API Key (full perms) or its stored login.
function wranglerEnv() {
  const e = { ...process.env };
  delete e.CLOUDFLARE_API_TOKEN;
  delete e.CF_API_TOKEN;
  return e;
}

function wranglerAuthenticated() {
  const r = spawnSync("npx", ["wrangler", "whoami"], { stdio: ["ignore", "pipe", "pipe"], cwd: root, env: wranglerEnv() });
  return r.status === 0;
}

function applyMigrations() {
  log("🗄  Applying D1 migrations to remote database (idempotent)...");
  // Newer wrangler rejects an explicit --yes; it auto-skips the confirmation
  // prompt in non-interactive contexts (which this spawned process is).
  const r = spawnSync(
    "npx",
    ["wrangler", "d1", "migrations", "apply", "mednexus-db", "--remote"],
    { stdio: "inherit", cwd: root, env: wranglerEnv() }
  );
  if (r.status !== 0) {
    log("⚠ Migrations failed or were skipped. The worker may not have its schema yet.");
    return false;
  }
  return true;
}

function deploy() {
  log("🚀 Deploying worker to pick up the new tunnel url (npm run deploy)...");
  const r = spawnSync("npm", ["run", "deploy"], { stdio: "inherit", cwd: root, env: wranglerEnv() });
  if (r.status !== 0) {
    log("\n⚠ Deploy failed. After `npx wrangler login`, re-run: npm run tunnel\n");
  }
}

let cloudflared = resolveCloudflared();
if (!cloudflared) cloudflared = installCloudflared();

// Avoid orphaned tunnels from previous runs.
try {
  spawnSync("pkill", ["-f", "cloudflared tunnel"], { stdio: "ignore" });
} catch {
  /* none */
}

log(`▶ Starting quick tunnel -> ${LOCAL_TARGET}`);
log(`  (LM Studio must be running and serving its OpenAI-compatible /v1 API there)`);
const child = spawn(
  cloudflared,
  ["tunnel", "--url", LOCAL_TARGET, "--loglevel", "info"],
  { stdio: ["ignore", "pipe", "pipe"], env: process.env }
);

let captured = false;
function handle(line) {
  if (captured) return;
  const m = line.match(/https?:\/\/[a-z0-9.-]+\.trycloudflare\.com/i);
  if (m) {
    captured = true;
    onTunnelUp(m[0]);
  }
}
child.stdout.on("data", (d) => {
  const s = d.toString();
  process.stdout.write(s);
  s.split("\n").forEach(handle);
});
child.stderr.on("data", (d) => {
  const s = d.toString();
  process.stderr.write(s);
  s.split("\n").forEach(handle);
});

let handled = false;
function onTunnelUp(url) {
  if (handled) return;
  handled = true;
  const newUrl = updateWrangler(url);
  persistTunnelState(url);
  log(`\n✅ Tunnel live:   ${url}`);
  log(`✅ wrangler.toml: LOCAL_AI_URL = ${newUrl}`);

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
    deploy();
  } else {
    log("\nℹ Worker not authenticated. After `npx wrangler login`, re-run: npm run tunnel\n");
  }
}

setTimeout(() => {
  if (!captured) {
    log(`⚠ Could not capture the tunnel url from logs. Is LM Studio reachable at ${LOCAL_TARGET}?`);
    log("  Check: curl -s " + LOCAL_TARGET + "/v1/models");
  }
}, 20000);

child.on("exit", (code) => {
  log(`\ncloudflared exited (${code ?? "killed"})`);
  process.exit(code ?? 0);
});

const shutdown = () => child.kill("SIGINT");
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
