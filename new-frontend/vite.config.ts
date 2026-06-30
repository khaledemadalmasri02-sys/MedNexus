import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  envDir: path.resolve(__dirname, '..'),
  plugins: [react(), tailwindcss()],
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
      changeOrigin: false,
      ws: true,
    },
  },
},
  build: {
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
