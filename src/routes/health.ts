import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { logger } from "../lib/logger.js";
import { getConfig } from "../config.js";
import { sql } from "drizzle-orm";

const router = Router();

// Basic health check
router.get("/healthz", async (_req: Request, res: Response) => {
  try {
    // Check database connectivity
    await db.run(sql`SELECT 1`);
    
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: getConfig().NODE_ENV,
    });
  } catch (err) {
    logger.error({ err }, "Health check failed");
    res.status(503).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

// Detailed health check
router.get("/health", async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latency?: number; providers?: string[] }> = {};
  
  // Database check
  const dbStart = Date.now();
  try {
    await db.run(sql`SELECT 1`);
    checks.database = { status: "ok", latency: Date.now() - dbStart };
  } catch (err) {
    checks.database = { status: "error" };
    logger.error({ err }, "Database health check failed");
  }
  
  // AI provider check (if configured)
  const aiProviders: string[] = [];
  if (process.env.OPENROUTER_API_KEY) aiProviders.push("openrouter");
  if (process.env.OPENAI_API_KEY) aiProviders.push("openai");
  if (process.env.GROQ_API_KEY) aiProviders.push("groq");
  
  checks.ai = {
    status: aiProviders.length > 0 ? "configured" : "not_configured",
    providers: aiProviders,
  };
  
  const allOk = Object.values(checks).every((c) => c.status === "ok" || c.status === "configured");
  
  res.status(allOk ? 200 : 503).json({
    status: allOk ? "healthy" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Model info endpoint
router.get("/model-info", (_req: Request, res: Response) => {
  res.json({
    text: process.env.AI_TEXT_MODEL || "not configured",
    vision: process.env.AI_VISION_MODEL || "not configured",
    qbank: process.env.AI_QBANK_MODEL || "not configured",
    explain: process.env.AI_EXPLAIN_MODEL || "not configured",
    providers: {
      openrouter: !!process.env.OPENROUTER_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      ollama: !!process.env.OLLAMA_CLOUD_API_KEY,
    },
  });
});

export default router;
