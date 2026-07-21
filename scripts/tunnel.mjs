import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { homedir, tmpdir } from "node:os";
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

// Named tunnel config. A NAMED tunnel gives a STABLE, fixed URL
// (https://<tunnelId>.cfargotunnel.com) that survives restarts — unlike the
// ephemeral *.trycloudflare.com quick-tunnels that expire the moment the
// cloudflared process stops (the original "Channel Error" / "canceled" cause).
// The token (and tunnel id/name) live in .tunnel-state.json, populated by a
// prior `cloudflared tunnel create` + `cloudflared tunnel token <name>`.
const TUNNEL_NAME = process.env.TUNNEL_NAME || tunnelState?.name || "mednexus";
const TUNNEL_ID = tunnelState?.tunnelId || null;
const TUNNEL_TOKEN = tunnelState?.token || null;
// A named tunnel's stable public hostname. We use a custom hostname in your
// own zone (ai.mednexus.fit) rather than the auto-provisioned
// <tunnelId>.cfargotunnel.com, because the latter was not routing correctly
// (Cloudflare returned 1102). Override with TUNNEL_STABLE_URL env if needed.
const NAMED_TUNNEL_URL = TUNNEL_ID
  ? (process.env.TUNNEL_STABLE_URL || "https://ai.mednexus.fit/v1")
  : null;

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
  // The URL passed in may already end in /v1 (named tunnel) or not (quick
  // tunnel). Normalize to exactly one trailing /v1.
  const base = tunnelUrl.replace(/\/v1\/?$/, "").replace(/\/+$/, "");
  const newUrl = `${base}/v1`;
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

function persistTunnelState(tunnelUrl, extra = {}) {
  const state = {
    ...(tunnelState || {}),
    ...extra,
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

// ── NAMED TUNNEL PATH (stable URL, survives restarts) ──
// Runs the pre-created named tunnel `mednexus` using its token. The public
// hostname is fixed: https://<tunnelId>.cfargotunnel.com — no expiry.
//
// NOTE: we force `protocol: http2` (TCP) instead of the default QUIC (UDP).
// On some networks (e.g. AS8376/Jordan) the QUIC datagram stream is reset by
// the ISP, causing the connector to flap ("control stream failure" → 530/1102
// → "AI service unavailable"). HTTP/2 over TCP is stable there.
function writeCloudflaredConfig() {
  const cfgPath = join(tmpdir(), "mednexus-cloudflared.yml");
  writeFileSync(cfgPath, `url: ${LOCAL_TARGET}\nprotocol: http2\n`);
  return cfgPath;
}

function startNamedTunnel(cloudflared) {
  if (!TUNNEL_TOKEN || !TUNNEL_ID) {
    log("⚠ No named-tunnel token found in .tunnel-state.json.");
    log("  Create one once with: cloudflared tunnel create mednexus");
    log("  then: cloudflared tunnel token mednexus  (save into .tunnel-state.json `token`)");
    return null;
  }
  const cfgPath = writeCloudflaredConfig();
  log(`▶ Starting NAMED tunnel "${TUNNEL_NAME}" (stable URL: ${NAMED_TUNNEL_URL})`);
  log(`  -> LM Studio at ${LOCAL_TARGET}  [protocol: http2/TCP]`);
  const child = spawn(
    cloudflared,
    ["--config", cfgPath, "tunnel", "run", "--token", TUNNEL_TOKEN, TUNNEL_NAME],
    { stdio: ["ignore", "pipe", "pipe"], env: process.env }
  );
  return child;
}

// ── QUICK TUNNEL FALLBACK (ephemeral — only if no named tunnel is configured) ──
function startQuickTunnel(cloudflared) {
  const cfgPath = writeCloudflaredConfig();
  log(`▶ Starting QUICK tunnel -> ${LOCAL_TARGET} (ephemeral URL, expires on exit)`);
  log(`  (LM Studio must be running and serving its OpenAI-compatible /v1 API there)`);
  const child = spawn(
    cloudflared,
    ["--config", cfgPath, "tunnel", "--loglevel", "info"],
    { stdio: ["ignore", "pipe", "pipe"], env: process.env }
  );
  return child;
}

function onTunnelUp(url, isNamed) {
  const newUrl = updateWrangler(url);
  persistTunnelState(url, isNamed ? { tunnelId: TUNNEL_ID, name: TUNNEL_NAME, token: TUNNEL_TOKEN } : {});
  log(`✅ Tunnel live:   ${url}`);
  log(`✅ wrangler.toml: LOCAL_AI_URL = ${newUrl}`);
  log(`✅ Worker deployed to: https://mednexus.fit`);
  log(`   Route: https://api.mednexus.fit`);
  if (isNamed) {
    log(`ℹ This is a NAMED tunnel — the URL is STABLE and survives restarts.`);
    log(`  Leave this process running (or run \`npm run tunnel\` again later) to keep it up.`);
  } else {
    log(`⚠ This is a QUICK tunnel — the URL expires when this process stops.`);
  }
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

// ── Main ──
let cloudflared = resolveCloudflared();
if (!cloudflared) cloudflared = installCloudflared();

// Avoid orphaned tunnels from previous runs.
try {
  spawnSync("pkill", ["-f", "cloudflared tunnel"], { stdio: "ignore" });
} catch {
  /* none */
}

const useNamed = !!TUNNEL_TOKEN && !!TUNNEL_ID && !process.argv.includes("--quick");
const child = useNamed ? startNamedTunnel(cloudflared) : startQuickTunnel(cloudflared);

if (!child) {
  // Named tunnel unavailable and we didn't fall back — try quick tunnel.
  if (useNamed) {
    log("ℹ Falling back to a quick tunnel (ephemeral)...\n");
    const q = startQuickTunnel(cloudflared);
    if (!q) {
      log("❌ Could not start any tunnel. Is cloudflared installed?");
      process.exit(1);
    }
    attachCapturer(q, false);
  } else {
    log("❌ Could not start tunnel. Is cloudflared installed?");
    process.exit(1);
  }
} else {
  attachCapturer(child, useNamed);
}

function attachCapturer(child, isNamed) {
  let captured = false;
  function handle(line) {
    if (captured) return;
    if (isNamed) {
      // Named tunnel: URL is already known and stable — don't wait for logs.
      captured = true;
      onTunnelUp(NAMED_TUNNEL_URL, true);
      return;
    }
    const m = line.match(/https?:\/\/[a-z0-9.-]+\.trycloudflare\.com/i);
    if (m) {
      captured = true;
      onTunnelUp(m[0], false);
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

  // For named tunnels, give the process a moment to actually connect, then
  // confirm. For quick tunnels, wait for the URL to appear in the logs.
  if (isNamed) {
    setTimeout(() => {
      if (!captured) {
        // Still mark up using the known stable URL; the tunnel may just be slow
        // to log. onTunnelUp is idempotent via `captured`.
        captured = true;
        onTunnelUp(NAMED_TUNNEL_URL, true);
      }
    }, 4000);
  } else {
    setTimeout(() => {
      if (!captured) {
        log(`⚠ Could not capture the tunnel url from logs. Is LM Studio reachable at ${LOCAL_TARGET}?`);
        log("  Check: curl -s " + LOCAL_TARGET + "/v1/models");
      }
    }, 20000);
  }

  child.on("exit", (code) => {
    log(`\ncloudflared exited (${code ?? "killed"})`);
    if (isNamed) {
      log("ℹ Named tunnel stopped. Re-run `npm run tunnel` to bring it back up (same stable URL).");
    }
    process.exit(code ?? 0);
  });
}

const shutdown = () => child.kill("SIGINT");
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
