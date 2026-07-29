#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const BACKEND_PORT = 3001;
const FRONTEND_PORT = 5173;
const LM_STUDIO_IP = '192.168.100.99';
const LM_STUDIO_PORT = 1234;

function log(msg) {
  console.log(msg);
}

function findNgrok() {
  const paths = [
    `${homedir()}/.local/bin/ngrok`,
    '/usr/local/bin/ngrok',
    '/usr/bin/ngrok',
    'ngrok'
  ];
  for (const p of paths) {
    try {
      const r = spawnSync(p, ['version'], { stdio: 'ignore' });
      if (r.status === 0) return p;
    } catch {}
  }
  return null;
}

function installNgrok() {
  log('⬇ Installing ngrok...');
  spawnSync('mkdir', ['-p', `${homedir()}/.local/bin`], { stdio: 'ignore' });
  const url = 'https://bin.equinox.io/c/bNyj1m1r5gY/ngrok-v3-stable-linux-amd64.tgz';
  const r = spawnSync('curl', ['-sL', url, '-o', '/tmp/ngrok.tgz'], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ngrok download failed');
  spawnSync('tar', ['-xzf', '/tmp/ngrok.tgz', '-C', '/tmp'], { stdio: 'inherit' });
  spawnSync('mv', ['/tmp/ngrok', `${homedir()}/.local/bin/ngrok`], { stdio: 'inherit' });
  spawnSync('chmod', ['+x', `${homedir()}/.local/bin/ngrok`], { stdio: 'inherit' });
  log('✅ ngrok installed.');
  return `${homedir()}/.local/bin/ngrok`;
}

function killProcessOnPort(port) {
  try {
    spawnSync('fuser', ['-k', `${port}/tcp`], { stdio: 'ignore' });
  } catch {}
}

function updateFrontendEnv(url) {
  const frontendEnvPath = resolve(root, 'new-frontend/.env');
  const ngrokUrl = url.replace(/\/$/, '');
  const newContent = `VITE_GOOGLE_CLIENT_ID=911372032508-7oi1o2s1o76c3uhiajj9eiuong17ulr3.apps.googleusercontent.com
VITE_API_URL=${ngrokUrl}
`;
  writeFileSync(frontendEnvPath, newContent);
  log(`✅ Updated new-frontend/.env with VITE_API_URL=${ngrokUrl}`);
}

function updateLocalAIUrl() {
  const wranglerPath = resolve(root, 'wrangler.jsonc');
  let content;
  try {
    content = readFileSync(wranglerPath, 'utf8');
  } catch {
    log('⚠ Could not read wrangler.jsonc');
    return;
  }
  const lmUrl = `http://${LM_STUDIO_IP}:${LM_STUDIO_PORT}/v1`;
  const aiRe = /"LOCAL_AI_URL"\s*:\s*"[^"]*"/;
  if (aiRe.test(content)) {
    content = content.replace(aiRe, `"LOCAL_AI_URL": "${lmUrl}"`);
    writeFileSync(wranglerPath, content);
    log(`✅ Updated wrangler.jsonc LOCAL_AI_URL=${lmUrl}`);
  }
}

function getNgrokUrl() {
  try {
    const r = spawnSync('curl', ['-s', 'http://127.0.0.1:4040/api/tunnels'], { stdio: ['ignore', 'pipe', 'pipe'] });
    if (r.status === 0) {
      const data = JSON.parse(r.stdout.toString());
      if (data.tunnels && data.tunnels.length > 0) {
        const tunnel = data.tunnels.find(t => t.public_url);
        if (tunnel) return tunnel.public_url;
      }
    }
  } catch {}
  return null;
}

function waitForNgrok(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const url = getNgrokUrl();
    if (url) return url;
    spawnSync('sleep', ['0.5'], { stdio: 'ignore' });
  }
  return null;
}

function buildFrontend() {
  log('🏗 Building frontend...');
  const result = spawnSync('npm', ['run', 'build:frontend'], {
    cwd: root,
    stdio: 'inherit',
    timeout: 120000
  });
  return result.status === 0;
}

function main() {
  let ngrok = findNgrok();
  if (!ngrok) ngrok = installNgrok();

  killProcessOnPort(BACKEND_PORT);
  killProcessOnPort(FRONTEND_PORT);

  updateLocalAIUrl();

  log('🚀 Starting local backend (wrangler dev)...');
  const backend = spawn('npx', ['wrangler', 'dev', '--port', String(BACKEND_PORT), '--host', 'localhost'], {
    cwd: root,
    stdio: ['inherit', 'inherit', 'inherit'],
    env: { ...process.env, PORT: String(BACKEND_PORT) }
  });

  setTimeout(() => {
    log(`▶ Starting ngrok tunnel -> http://localhost:${BACKEND_PORT}`);
    const ngrokChild = spawn(ngrok, ['http', String(BACKEND_PORT), '--log', 'stdout'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env
    });

    ngrokChild.stdout.on('data', (d) => {
      const s = d.toString();
      if (s.includes('started tunnel')) {
        const url = getNgrokUrl();
        if (url) {
          log(`✅ Tunnel URL: ${url}`);
          updateFrontendEnv(url);
          log('');
          log('🎉 Setup complete!');
          log('');
          log('📋 Next steps:');
          log('   1. Your backend is running locally at http://localhost:3001');
          log('   2. Exposed via ngrok at: ' + url);
          log('   3. Frontend .env updated with VITE_API_URL=' + url);
          log('   4. Run: npm run build  (to build frontend with new URL)');
          log('   5. Deploy frontend to Cloudflare Pages from new-frontend/dist/');
          log('');
          log('💡 To stop: Ctrl+C');
        }
      }
    });

    ngrokChild.stderr.on('data', (d) => process.stderr.write(d.toString()));

    process.on('SIGINT', () => {
      log('\n🛑 Stopping...');
      backend.kill();
      ngrokChild.kill();
      process.exit(0);
    });
  }, 3000);

  backend.on('close', (code) => {
    if (code !== 0) {
      log(`Backend process exited with code ${code}`);
    }
  });
}

main();