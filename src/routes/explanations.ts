import { Hono } from "hono";
import { and, eq, isNull, or } from "drizzle-orm";
import type { AppEnv } from "../types";
import { cards } from "../db/index";
import { getDb } from "../lib/helpers";
import { createAIService, type AIService, type ExplainMode } from "../lib/ai";
import { logger } from "../lib/logger";

// Maximum number of simultaneous AI requests. Kept at 3 so we don't
// flood the provider and get rate-limited; generation still covers every card.
const MAX_CONCURRENT_REQUESTS = 3;

// Match OpenRouter / provider 429 rate-limit responses so we can stop
// early and report a clear message instead of burning the whole quota.
function isRateLimit(err: unknown): boolean {
  const msg = (err as Error)?.message || "";
  return /\b429\b/i.test(msg) || /rate limit/i.test(msg);
}

export const explanationRoutes = new Hono<AppEnv>();

interface GenerationProgress {
  deckId: number;
  total: number;
  completed: number;
  failed: number;
  status: "idle" | "running" | "completed" | "failed";
  currentCard?: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

// In-memory progress store (per-isolate; resets on cold start — mirrors the
// original module-level store; note: not shared across Workers isolates).
const progressStore = new Map<number, GenerationProgress>();

function getProgress(deckId: number): GenerationProgress | null {
  return progressStore.get(deckId) || null;
}

function getAllProgress(): GenerationProgress[] {
  return Array.from(progressStore.values());
}

// A card needs generation when it has no full explanation, OR the stored one
// is an empty string (a previous run may have failed and saved ""). Treating
// "" as "missing" lets the deck self-heal instead of being wrongly flagged as
// "already complete" and never retried.
function needsGeneration(): any {
  return or(isNull(cards.explanationFull), eq(cards.explanationFull, ""));
}

async function hasCardsWithoutExplanations(deckId: number, db: any): Promise<boolean> {
  const result = await db.query.cards.findFirst({
    where: and(
      eq(cards.deckId, deckId),
      needsGeneration()
    ),
  });
  return !!result;
}

async function getExplanationStats(deckId: number, db: any): Promise<{
  total: number;
  withExplanations: number;
  withoutExplanations: number;
}> {
  const allCards = await db.query.cards.findMany({
    where: eq(cards.deckId, deckId),
  });

  const withExplanations = allCards.filter((c: any) => c.explanationFull && c.explanationFull.trim() !== "").length;

  return {
    total: allCards.length,
    withExplanations,
    withoutExplanations: allCards.length - withExplanations,
  };
}

async function generateExplanationsForDeck(deckId: number, db: any, ai: AIService): Promise<void> {
  const existing = progressStore.get(deckId);
  if (existing?.status === "running") {
    logger.info({ deckId }, "Explanation generation already running");
    return;
  }

  const progress: GenerationProgress = {
    deckId,
    total: 0,
    completed: 0,
    failed: 0,
    status: "running",
    startedAt: new Date(),
  };
  progressStore.set(deckId, progress);

    try {
      const cardsWithoutExplanations = await db.query.cards.findMany({
        where: and(
          eq(cards.deckId, deckId),
          needsGeneration()
        ),
      });

      progress.total = cardsWithoutExplanations.length;
      logger.info({ deckId, total: progress.total }, "Starting explanation generation");

      if (cardsWithoutExplanations.length === 0) {
        progress.status = "completed";
        progress.completedAt = new Date();
        progressStore.set(deckId, { ...progress });
        return;
      }

      // Batch explanations: ALL 7 modes for up to BATCH_SIZE cards in a
      // SINGLE AI request (see ai.explainCardsBatch). This collapses
      // what used to be 7*N requests down to ceil(N / BATCH_SIZE):
      // a 14-card deck = 2 calls, a 55-card deck = 6 calls (not 385).
      // Keep only MAX_CONCURRENT_REQUESTS (3) batched requests in flight.
      const BATCH_SIZE = 10;
      const chunks: Array<Array<any>> = [];
      for (let i = 0; i < cardsWithoutExplanations.length; i += BATCH_SIZE) {
        chunks.push(cardsWithoutExplanations.slice(i, i + BATCH_SIZE));
      }

      let aborted = false;
      let rateLimitMsg = "";
      let cursor = 0;
      const aiWorkers = Array.from({ length: Math.min(MAX_CONCURRENT_REQUESTS, chunks.length) }, async () => {
        while (cursor < chunks.length) {
          const i = cursor++;
          const chunk = chunks[i];
          if (aborted) continue;
          try {
            // Returns a map keyed by the 1-based card index within this chunk.
            const batch = await ai.explainCardsBatch(
              chunk.map((c: any) => ({ front: c.front, back: c.back }))
            );

            // Persist each card in the chunk.
            for (let n = 1; n <= chunk.length; n++) {
              const card = chunk[n - 1];
              const explanations: Record<ExplainMode, string> = batch[n] || {
                full: "", revision: "", osce: "", brief: "", mnemonic: "", clinical: "", testtrap: "",
              };

              // Only persist fields that actually generated content. We never
              // write an empty string for explanationFull (that would make the
              // card look "done" and block future retries). Existing good
              // values are preserved when a particular mode failed this run.
              const set: Record<string, unknown> = { updatedAt: new Date() };
              if (explanations.full && explanations.full.trim() !== "") {
                set.explanationFull = explanations.full;
                set.explanationsGeneratedAt = new Date();
              }
              if (explanations.revision && explanations.revision.trim() !== "") set.explanationRevision = explanations.revision;
              if (explanations.osce && explanations.osce.trim() !== "") set.explanationOsce = explanations.osce;
              if (explanations.brief && explanations.brief.trim() !== "") set.explanationBrief = explanations.brief;
              if (explanations.mnemonic && explanations.mnemonic.trim() !== "") set.explanationMnemonic = explanations.mnemonic;
              if (explanations.clinical && explanations.clinical.trim() !== "") set.explanationClinical = explanations.clinical;
              if (explanations.testtrap && explanations.testtrap.trim() !== "") set.explanationTesttrap = explanations.testtrap;

              await db.update(cards).set(set).where(eq(cards.id, card.id));

              // Treat a card as completed only if its full explanation now
              // exists; otherwise leave it for a future run to retry.
              const current = await db.query.cards.findFirst({ where: eq(cards.id, card.id) });
              if (current?.explanationFull && current.explanationFull.trim() !== "") {
                progress.completed++;
              } else {
                progress.failed++;
              }
            }
          } catch (err) {
            if (isRateLimit(err)) {
              // Stop the whole run early so we don't burn the rest of a
              // tiny daily quota on guaranteed-failing requests.
              aborted = true;
              rateLimitMsg = "OpenRouter free-model quota exhausted (50 requests/day). Add credits to your OpenRouter key, or wait for the daily reset, then retry.";
              progress.failed += chunk.length;
              logger.warn({ deckId }, "Explanation generation stopped: rate limit");
              continue;
            }
            progress.failed += chunk.length;
            logger.error({ err, deckId }, "Failed to generate explanations for a batch of cards");
          }
          progressStore.set(deckId, { ...progress });
        }
      });
      await Promise.all(aiWorkers);

      if (aborted) {
        progress.status = "failed";
        progress.error = rateLimitMsg;
        progress.completedAt = new Date();
        progressStore.set(deckId, { ...progress });
        logger.warn({ deckId, completed: progress.completed, failed: progress.failed }, "Explanation generation stopped (rate limit)");
        return;
      }

      progress.status = "completed";
      progress.completedAt = new Date();
      logger.info({ deckId, completed: progress.completed, failed: progress.failed }, "Explanation generation completed");
    } catch (err) {
    progress.status = "failed";
    progress.error = (err as Error).message;
    progress.completedAt = new Date();
    logger.error({ err, deckId }, "Explanation generation failed");
  }

  progressStore.set(deckId, { ...progress });
}

explanationRoutes.post("/explanations/generate/:deckId", async (c) => {
  const deckId = parseInt(c.req.param("deckId") ?? "", 10);

  if (isNaN(deckId)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } }, 400);
  }

  try {
    const db = getDb(c);
    const hasCards = await hasCardsWithoutExplanations(deckId, db);
    if (!hasCards) {
      return c.json({
        message: "All cards already have explanations",
        started: false,
      });
    }

    const ai = createAIService(c.env);
    const promise = generateExplanationsForDeck(deckId, db, ai);
    const ec = (c as any).executionCtx;
    if (ec && typeof ec.waitUntil === "function") {
      ec.waitUntil(promise.catch((err) => logger.error({ err, deckId }, "Background explanation generation failed")));
    } else {
      promise.catch((err) => logger.error({ err, deckId }, "Background explanation generation failed"));
    }

    return c.json({
      message: "Explanation generation started",
      started: true,
      deckId,
    });
  } catch (err) {
    logger.error({ err, deckId }, "Failed to start explanation generation");
    return c.json({ error: { code: "GENERATION_ERROR", message: "Failed to start explanation generation" } }, 500);
  }
});

explanationRoutes.get("/explanations/progress/:deckId", async (c) => {
  const deckId = parseInt(c.req.param("deckId") ?? "", 10);

  if (isNaN(deckId)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } }, 400);
  }

  try {
    const db = getDb(c);
    const progress = getProgress(deckId);
    const stats = await getExplanationStats(deckId, db);

    return c.json({
      progress: progress || {
        deckId,
        total: stats.total,
        completed: stats.withExplanations,
        failed: 0,
        status: stats.withoutExplanations === 0 ? "completed" : "idle",
      },
      stats,
    });
  } catch (err) {
    logger.error({ err, deckId }, "Failed to get explanation progress");
    return c.json({ error: { code: "SERVER_ERROR", message: "Failed to get progress" } }, 500);
  }
});

explanationRoutes.get("/explanations/progress", async (c) => {
  try {
    const allProgress = getAllProgress();
    return c.json({ progress: allProgress });
  } catch (err) {
    logger.error({ err }, "Failed to get all progress");
    return c.json({ error: { code: "SERVER_ERROR", message: "Failed to get progress" } }, 500);
  }
});

explanationRoutes.get("/explanations/stats/:deckId", async (c) => {
  const deckId = parseInt(c.req.param("deckId") ?? "", 10);

  if (isNaN(deckId)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } }, 400);
  }

  try {
    const db = getDb(c);
    const stats = await getExplanationStats(deckId, db);
    return c.json(stats);
  } catch (err) {
    logger.error({ err, deckId }, "Failed to get explanation stats");
    return c.json({ error: { code: "SERVER_ERROR", message: "Failed to get stats" } }, 500);
  }
});
