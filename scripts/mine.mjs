#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const BACKEND_PORT = 3001;
const LM_STUDIO_HOST = '192.168.100.99';
const LM_STUDIO_PORT = 1234;
const FRONTEND_DIR = resolve(root, 'new-frontend');
const FRONTEND_ENV = resolve(FRONTEND_DIR, '.env');
const BACKEND_TUNNEL_URL = 'https://api.mednexus.fit';

function log(msg) {
  console.log(msg);
}

function error(msg) {
  console.error(msg);
}

function killProcessOnPort(port) {
  try {
    spawnSync('fuser', ['-k', `${port}/tcp`], { stdio: 'ignore' });
  } catch {}
}

function updateFrontendEnv(backendUrl) {
  const cleanUrl = backendUrl.replace(/\/$/, '');
  const content = `VITE_GOOGLE_CLIENT_ID=911372032508-7oi1o2s1o76c3uhiajj9eiuong17ulr3.apps.googleusercontent.com
VITE_API_URL=${cleanUrl}
`;
  writeFileSync(FRONTEND_ENV, content);
  log(`✅ Updated ${FRONTEND_ENV} with VITE_API_URL=${cleanUrl}`);
}

function updateWranglerLocalAI(lmStudioUrl) {
  const wranglerPath = resolve(root, 'wrangler.jsonc');
  let content;
  try {
    content = readFileSync(wranglerPath, 'utf8');
  } catch {
    log('⚠ Could not read wrangler.jsonc');
    return;
  }
  const aiRe = /"LOCAL_AI_URL"\s*:\s*"[^"]*"/;
  if (aiRe.test(content)) {
    content = content.replace(aiRe, `"LOCAL_AI_URL": "${lmStudioUrl}"`);
    writeFileSync(wranglerPath, content);
    log(`✅ Updated wrangler.jsonc LOCAL_AI_URL=${lmStudioUrl}`);
  }
}

function buildFrontend() {
  log('🏗 Building frontend...');
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: FRONTEND_DIR,
    stdio: 'inherit',
    timeout: 180000
  });
  return result.status === 0;
}

function deployFrontend() {
  log('🚀 Deploying frontend to Cloudflare Pages...');
  const result = spawnSync('npx', ['wrangler', 'pages', 'deploy', 'dist', '--project-name', 'mednexus-frontend'], {
    cwd: FRONTEND_DIR,
    stdio: 'inherit',
    timeout: 300000
  });
  return result.status === 0;
}

async function main() {
  log('🚀 Starting mine script...');
  log('');

  killProcessOnPort(BACKEND_PORT);

  const lmStudioUrl = `http://${LM_STUDIO_HOST}:${LM_STUDIO_PORT}`;
  updateWranglerLocalAI(lmStudioUrl);

  log('🚀 Starting local backend (standalone Node.js)...');
  const backend = spawn('npx', ['tsx', 'src/standalone.ts'], {
    cwd: root,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { 
      ...process.env, 
      PORT: String(BACKEND_PORT), 
      LOCAL_AI_URL: lmStudioUrl,
      AI_TEXT_MODEL: 'lmstudio/qwen3.5-4b',
      AI_VISION_MODEL: 'lmstudio/qwen3.5-4b',
      AI_QBANK_MODEL: 'lmstudio/qwen3.5-4b',
      AI_EXPLAIN_MODEL: 'lmstudio/qwen3.5-4b',
      AI_STUDY_BUDDY_MODEL: 'lmstudio/qwen3.5-4b'
    }
  });

  const stderrChunks = [];
  const stdoutChunks = [];

  backend.stdout.on('data', (d) => {
    const s = d.toString();
    stdoutChunks.push(s);
    process.stdout.write(s);
  });

  backend.stderr.on('data', (d) => {
    const s = d.toString();
    stderrChunks.push(s);
    process.stderr.write(s);
  });

  await new Promise(resolve => setTimeout(resolve, 3000));

  if (backend.exitCode !== null && backend.exitCode !== 0) {
    error('❌ Backend failed to start');
    process.exit(1);
  }

  updateFrontendEnv(BACKEND_TUNNEL_URL);

  log('');
  log('🏗 Building and deploying frontend...');

  if (buildFrontend()) {
    if (deployFrontend()) {
      log('');
      log('🎉 SUCCESS!');
      log('');
      log('📋 Summary:');
      log(`   • Backend running locally at: http://localhost:${BACKEND_PORT}`);
      log(`   • LM Studio at: ${lmStudioUrl}`);
      log(`   • Backend calls LM Studio via direct LAN`);
      log(`   • Backend exposed via Cloudflare Tunnel: ${BACKEND_TUNNEL_URL}`);
      log(`   • Frontend deployed to Cloudflare Pages`);
      log(`   • Frontend calls backend via: ${BACKEND_TUNNEL_URL}`);
      log('');
      log('💡 Backend is still running. Press Ctrl+C to stop everything.');
    } else {
      error('❌ Frontend deploy failed');
      backend.kill();
      process.exit(1);
    }
  } else {
    error('❌ Frontend build failed');
    backend.kill();
    process.exit(1);
  }

  process.on('SIGINT', () => {
    log('\n🛑 Stopping...');
    backend.kill();
    process.exit(0);
  });

  backend.on('close', (code) => {
    if (code !== 0) {
      log(`Backend process exited with code ${code}`);
    }
  });

  await new Promise(() => {});
}

main().catch(err => {
  error('❌ Error:', err.message);
  process.exit(1);
});