import { Router, Request, Response } from "express";
import crypto from "crypto";
import { db, articleJobs, decks, cards } from "../db/index.js";
import { eq, inArray } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { articleEvents } from "../lib/article-events.js";
import { runArticleJob } from "../lib/article-generator.js";
import { getDeckTopics } from "../lib/topics.js";

const router = Router();

// Map DB row to the frontend ArticleJob shape.
function mapJob(row: typeof articleJobs.$inferSelect) {
  return {
    id: row.id,
    deckId: row.deckId,
    topic: row.topic,
    status: row.status as "pending" | "running" | "completed" | "failed",
    progress: row.progress,
    content: row.contentMarkdown,
    outline: row.outline ?? undefined,
    error: row.error ?? undefined,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

async function deckExists(req: Request, deckId: number): Promise<boolean> {
  const d = await db.select({ id: decks.id }).from(decks).where(eq(decks.id, deckId)).limit(1);
  return d.length > 0;
}

// List jobs for a deck
router.get("/decks/:deckId/article-jobs", async (req: Request, res: Response) => {
  const deckId = parseInt(req.params.deckId, 10);
  if (isNaN(deckId)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } });
    return;
  }
  if (!(await deckExists(req, deckId))) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Deck not found" } });
    return;
  }
  try {
    const jobs = await db.select().from(articleJobs).where(eq(articleJobs.deckId, deckId))
      .orderBy(articleJobs.createdAt);
    res.json({ jobs: jobs.map(mapJob) });
  } catch (err) {
    logger.error({ err }, "Failed to list article jobs");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list article jobs" } });
  }
});

// List suggested topics for a deck
router.get("/decks/:deckId/topics", async (req: Request, res: Response) => {
  const deckId = parseInt(req.params.deckId, 10);
  if (isNaN(deckId)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } });
    return;
  }
  if (!(await deckExists(req, deckId))) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Deck not found" } });
    return;
  }
  try {
    const allDecks = await db.query.decks.findMany();
    const ids: number[] = [deckId];
    const stack = [deckId];
    while (stack.length) {
      const current = stack.pop()!;
      const children = allDecks.filter(d => d.parentId === current).map(d => d.id);
      for (const c of children) {
        ids.push(c);
        stack.push(c);
      }
    }
    const rows = await db.select({
      front: cards.front,
      back: cards.back,
      tags: cards.tags,
    }).from(cards).where(inArray(cards.deckId, ids));

    const topics = getDeckTopics(rows);
    res.json({ topics });
  } catch (err) {
    logger.error({ err }, "Failed to compute topics");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to compute topics" } });
  }
});

// Create a job
router.post("/decks/:deckId/article-jobs", async (req: Request, res: Response) => {
  const deckId = parseInt(req.params.deckId, 10);
  const topic = typeof req.body?.topic === "string" ? req.body.topic.trim() : "";
  if (isNaN(deckId)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } });
    return;
  }
  if (!topic || topic.length > 500) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Topic is required (max 500 chars)" } });
    return;
  }
  if (!(await deckExists(req, deckId))) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Deck not found" } });
    return;
  }
  try {
    const id = crypto.randomUUID();
    const now = new Date();
    const [job] = await db.insert(articleJobs).values({
      id,
      deckId,
      topic,
      status: "pending",
      progress: 0,
      createdAt: now,
      updatedAt: now,
    }).returning();

    setImmediate(() => {
      runArticleJob(id, deckId, topic).catch(err => logger.error({ err }, "Article job crashed"));
    });

    res.status(202).json({ job: mapJob(job) });
  } catch (err) {
    logger.error({ err }, "Failed to create article job");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create article job" } });
  }
});

// Get a single job
router.get("/article-jobs/:id", async (req: Request, res: Response) => {
  try {
    const job = await db.query.articleJobs.findFirst({ where: eq(articleJobs.id, req.params.id) });
    if (!job) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Job not found" } });
      return;
    }
    res.json(mapJob(job));
  } catch (err) {
    logger.error({ err }, "Failed to get article job");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get article job" } });
  }
});

// Delete a job
router.delete("/article-jobs/:id", async (req: Request, res: Response) => {
  try {
    const job = await db.query.articleJobs.findFirst({ where: eq(articleJobs.id, req.params.id) });
    if (!job) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Job not found" } });
      return;
    }
    await db.delete(articleJobs).where(eq(articleJobs.id, req.params.id));
    articleEvents.removeAll(req.params.id);
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete article job");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete article job" } });
  }
});

// SSE stream
router.get("/article-jobs/:id/stream", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const job = await db.query.articleJobs.findFirst({ where: eq(articleJobs.id, id) });
    if (!job) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Job not found" } });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const write = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const mapped = mapJob(job);
    const initialPayload = {
      status: mapped.status,
      progress: mapped.progress,
      outline: mapped.outline ? JSON.parse(mapped.outline) : undefined,
      content: mapped.content,
      final: mapped.status === "completed" || mapped.status === "failed",
      error: mapped.error,
    };
    write("status", initialPayload);

    if (job.status === "completed" || job.status === "failed") {
      res.end();
      return;
    }

    const unsubscribe = articleEvents.subscribe(id, (event) => {
      write("status", {
        status: event.status,
        progress: event.progress,
        outline: event.outline,
        content: event.contentMarkdown,
        final: Boolean(event.final),
        error: event.error,
      });
      if (event.final) {
        unsubscribe();
        articleEvents.removeAll(id);
        res.end();
      }
    });

    const ping = setInterval(() => {
      res.write(": ping\n\n");
    }, 15000);

    req.on("close", () => {
      clearInterval(ping);
      unsubscribe();
    });
  } catch (err) {
    logger.error({ err }, "SSE stream failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Stream failed" } });
  }
});

export default router;
