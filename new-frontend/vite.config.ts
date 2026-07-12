import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const isProduction = process.env.NODE_ENV === 'production'

export default defineConfig({
  envDir: path.resolve(__dirname, '..'),
  plugins: [react(), tailwindcss()],
  base: isProduction ? '/' : '/',
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      'components/ui': path.resolve(__dirname, './src/components/ui/index.tsx'),
      'lib/tui-engine': path.resolve(__dirname, './src/lib/tui-engine.ts'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
        // Generous timeouts: PDF extraction / summary generation can take a while.
        // Without these, the dev proxy can drop the connection and the browser
        // surfaces a generic "Network error during upload".
        timeout: 0,
        proxyTimeout: 0,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.error('[vite-proxy] /api proxy error:', err.message);
            const response = res as unknown as import('http').ServerResponse;
            if (response && typeof response.writeHead === 'function' && !response.headersSent) {
              response.writeHead(502, { 'Content-Type': 'application/json' });
            }
            if (response && typeof response.end === 'function' && !response.writableEnded) {
              response.end(JSON.stringify({ error: { code: 'PROXY_ERROR', message: 'Backend unreachable' } }));
            }
          });
          proxy.on('proxyReq', (proxyReq) => {
            // Ensure Host header matches the target backend
            proxyReq.setHeader('Host', 'localhost:3001');
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'vendor-react';
          if (id.includes('node_modules/react-router-dom')) return 'vendor-react';
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion';
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) return 'vendor-three';
          if (id.includes('node_modules/recharts')) return 'vendor-charts';
          if (id.includes('node_modules/fuse.js') || id.includes('node_modules/lucide-react') || id.includes('node_modules/react-markdown')) return 'vendor-utils';
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
})