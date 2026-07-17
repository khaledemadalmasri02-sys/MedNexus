import { Hono } from "hono";
import { sql } from "drizzle-orm";
import type { AppEnv } from "../types";
import type { DB } from "../db/index";
import { getConfig } from "../lib/config";

export const healthRoutes = new Hono<AppEnv>();

function getDb(c: any): DB { return c.get("db"); }

const healthz = async (c: any) => {
  try {
    await getDb(c).run(sql`SELECT 1`);
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (err) {
    return c.json({ status: "error", message: "Database connection failed" }, 503);
  }
};

const health = async (c: any) => {
  const checks: Record<string, any> = {};
  const dbStart = Date.now();
  try {
    await getDb(c).run(sql`SELECT 1`);
    checks.database = { status: "ok", latency: Date.now() - dbStart };
  } catch {
    checks.database = { status: "error" };
  }
  const cfg = getConfig(c.env);
  const aiProviders: string[] = [];
  if (cfg.OPENROUTER_API_KEY) aiProviders.push("openrouter");
  if (cfg.OPENAI_API_KEY) aiProviders.push("openai");
  if (cfg.GROQ_API_KEY) aiProviders.push("groq");
  if (cfg.LOCAL_AI_URL) aiProviders.push(`local(${cfg.LOCAL_AI_URL})`);
  checks.ai = { status: aiProviders.length > 0 ? "configured" : "not_configured", providers: aiProviders };
  const allOk = Object.values(checks).every((ch) => ch.status === "ok" || ch.status === "configured");
  return c.json({
    status: allOk ? "healthy" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
  }, allOk ? 200 : 503);
};

const modelInfo = (c: any) => {
  const cfg = getConfig(c.env);
  return c.json({
    text: cfg.AI_TEXT_MODEL,
    vision: cfg.AI_VISION_MODEL,
    qbank: cfg.AI_QBANK_MODEL,
    explain: cfg.AI_EXPLAIN_MODEL,
    providers: {
      openrouter: !!cfg.OPENROUTER_API_KEY,
      openai: !!cfg.OPENAI_API_KEY,
      groq: !!cfg.GROQ_API_KEY,
      ollama: !!cfg.OLLAMA_CLOUD_API_KEY,
      local: !!cfg.LOCAL_AI_URL,
    },
  });
};

// The frontend uses API_BASE_URL = "/api", so the same handlers are exposed both
// at the root and under /api.
healthRoutes.get("/healthz", healthz);
healthRoutes.get("/health", health);
healthRoutes.get("/model-info", modelInfo);
healthRoutes.get("/api/healthz", healthz);
healthRoutes.get("/api/health", health);
healthRoutes.get("/api/model-info", modelInfo);
