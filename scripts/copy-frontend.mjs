import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";

const src = new URL("../new-frontend/dist", import.meta.url).pathname;
const dest = new URL("../public", import.meta.url).pathname;

if (!existsSync(src)) {
  console.error("Frontend build not found at: " + src);
  console.error('Build it first: cd new-frontend && npm ci && npm run build');
  process.exit(1);
}

// Remove the destination first so stale chunks from previous builds are not
// left behind. cpSync only adds/overwrites files; leftover hashed assets
// (e.g. an old studypilot chunk) would otherwise linger and get served from
// the browser cache, causing phantom 404s on removed endpoints.
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log("Copied frontend build from " + src + " -> " + dest);
