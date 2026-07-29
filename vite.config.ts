import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [
    cloudflare({
      configPath: "./wrangler.jsonc",
      type: "javascript",
    }),
  ],
  build: {
    outDir: "./dist",
    sourcemap: false,
    rollupOptions: {
      input: {
        main: "./src/worker.ts",
      },
    },
  },
});