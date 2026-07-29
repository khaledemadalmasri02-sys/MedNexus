#!/usr/bin/env node
import { serve } from "@hono/node-server";
import { env } from "node:process";
import app from "./app.ts";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./db/schema";
import * as schemaFlashcard from "./db/schema-flashcard";
import * as schemaStudyPilot from "./db/schema-study-pilot";

// Load environment variables from .dev.vars or .env
async function loadEnv() {
  const { readFileSync, existsSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  
  const envFiles = [".dev.vars", ".env", ".env.local"];
  for (const file of envFiles) {
    const filePath = resolve(process.cwd(), file);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const [key, ...valueParts] = trimmed.split("=");
          if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join("=").trim().replace(/^"|"$/g, "");
          }
        }
      }
    }
  }
}

// Main async function
async function main() {
  await loadEnv();

  const PORT = Number(env.PORT) || 3001;

  // Use the Wrangler D1 database path
  const dbPath = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/95b8046ec59412fc795422b42d3edab6ecd3c5a5bea03b6dcf1df13862835a03.sqlite";

  const client = createClient({ url: `file:${dbPath}` });
  const db = drizzle(client, { schema });
  const flashcardDb = drizzle(client, { schema: schemaFlashcard });
  const studypilotDb = drizzle(client, { schema: schemaStudyPilot });

  // Create a D1-like wrapper for compatibility
  const createD1Wrapper = (db: any) => ({
    prepare: (sql: string) => db.prepare(sql),
    exec: (sql: string) => { db.exec(sql); return { count: 0 }; },
    batch: (stmts: any[]) => stmts.map(s => s.run()),
    dump: () => new Uint8Array(),
  });

  const d1Wrapper = createD1Wrapper(db);
  const flashcardWrapper = createD1Wrapper(flashcardDb);
  const studypilotWrapper = createD1Wrapper(studypilotDb);

  // Create bindings object - must match Bindings type
  const bindings = {
    DB: d1Wrapper,
    STUDYPILOT_DB: studypilotWrapper,
    LOCAL_DB: d1Wrapper,
    ASSETS: { fetch: async (req: Request) => new Response("Not found", { status: 404 }) },
    NODE_ENV: env.NODE_ENV || "development",
    APP_URL: env.APP_URL,
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
    OPENROUTER_API_KEY: env.OPENROUTER_API_KEY,
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    GROQ_API_KEY: env.GROQ_API_KEY,
    OLLAMA_CLOUD_API_KEY: env.OLLAMA_CLOUD_API_KEY,
    MISTRAL_API_KEY: env.MISTRAL_API_KEY,
    GOOGLE_AI_API_KEY: env.GOOGLE_AI_API_KEY,
    LOCAL_AI_URL: env.LOCAL_AI_URL || "http://192.168.100.99:1234/v1",
    AI_TEXT_MODEL: env.AI_TEXT_MODEL || "lmstudio/qwen3.5-4b",
    AI_VISION_MODEL: env.AI_VISION_MODEL || "lmstudio/qwen3.5-4b",
    AI_QBANK_MODEL: env.AI_QBANK_MODEL || "lmstudio/qwen3.5-4b",
    AI_EXPLAIN_MODEL: env.AI_EXPLAIN_MODEL || "lmstudio/qwen3.5-4b",
    STUDY_BUDDY_MODEL: env.STUDY_BUDDY_MODEL || "lmstudio/qwen3.5-4b",
    LOCAL_AI_TIMEOUT_MS: env.LOCAL_AI_TIMEOUT_MS || "0",
    FREE_MAX_DECKS: env.FREE_MAX_DECKS || "100",
    FREE_MAX_CARDS_PER_DECK: env.FREE_MAX_CARDS_PER_DECK || "200",
    ADMIN_SECRET_KEY: env.ADMIN_SECRET_KEY,
  };

  console.log(`Starting standalone server on port ${PORT}`);
  console.log(`LOCAL_AI_URL: ${bindings.LOCAL_AI_URL}`);
  console.log(`DATABASE: ${dbPath}`);

  // Create fetch handler that injects bindings
  const fetchHandler = (request: Request) => app.fetch(request, bindings, undefined as any);

  serve({
    fetch: fetchHandler,
    port: PORT,
    hostname: "localhost",
  }, (info) => {
    console.log(`Server running at http://${info.address}:${info.port}`);
  });
}

main().catch(console.error);