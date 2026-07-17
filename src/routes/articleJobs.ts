import { Hono } from "hono";
import { eq, inArray } from "drizzle-orm";
import type { AppEnv } from "../types";
import type { DB } from "../db/index";
import { articleJobs, decks, cards as cardsTable, createDb } from "../db/index";
import { getDb, notFound, serverError } from "../lib/helpers";
import { createAIService } from "../lib/ai";

export const articleJobRoutes = new Hono<AppEnv>();

// Map a DB row to the frontend ArticleJob shape.
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

async function deckExists(db: DB, deckId: number): Promise<boolean> {
  const d = await db.select({ id: decks.id }).from(decks).where(eq(decks.id, deckId)).limit(1);
  return d.length > 0;
}

// Inline replacement for getDeckTopics: derive candidate topics from card tags.
function getDeckTopics(rows: { front: string; back: string; tags: string | null }[]): string[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.tags) continue;
    for (const raw of r.tags.split(",")) {
      const t = raw.trim();
      if (t) counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map((e) => e[0]);
}

// Inline replacement for runArticleJob: generate outline + content via AI and
// persist progress into the articleJobs row (background, via waitUntil).
async function runArticleJob(env: AppEnv["Bindings"], id: string, deckId: number, topic: string) {
  const db = createDb(env.DB);
  const ai = createAIService(env);
  const update = (patch: Partial<typeof articleJobs.$inferInsert>) =>
    db.update(articleJobs).set({ ...patch, updatedAt: new Date() }).where(eq(articleJobs.id, id));

  try {
    await update({ status: "running", progress: 10 });
    const deckRows = await db.query.decks.findFirst({ where: eq(decks.id, deckId) });
    const cardRows = await db.query.cards.findMany({ where: eq(cardsTable.deckId, deckId) });
    if (!ai.hasAnyProvider()) {
      await update({ status: "failed", error: "No AI provider configured" });
      return;
    }
    const corpus = cardRows
      .map((c) => `${c.front}\n${c.back}`)
      .join("\n\n")
      .slice(0, 20000);

    const outlineResp = await ai.complete([
      {
        role: "system",
        content:
          "You are an outline builder. Given a topic and source notes, return ONLY a JSON array of section titles (strings). Example: [\"Introduction\",\"Pathophysiology\",\"Clinical Features\"]",
      },
      { role: "user", content: `Topic: ${topic}\nDeck: ${deckRows?.name || ""}\nSource notes:\n${corpus}` },
    ], { maxTokens: 1024 });

    let outline: string[] = [];
    try {
      const match = outlineResp.match(/\[[\s\S]*\]/);
      outline = match ? (JSON.parse(match[0]) as string[]) : [];
    } catch {
      outline = [];
    }
    await update({ progress: 45, outline: JSON.stringify(outline) });

    const content = await ai.complete([
      {
        role: "system",
        content:
          "You are a medical educator. Write a detailed, well-structured Markdown article using the provided outline and source notes. Use ## headings for each section and **bold** key terms.",
      },
      {
        role: "user",
        content: `Topic: ${topic}\nOutline:\n${outline.map((o, i) => `${i + 1}. ${o}`).join("\n")}\nSource notes:\n${corpus}`,
      },
    ], { maxTokens: 4096 });

    await update({ status: "completed", progress: 100, contentMarkdown: content });
  } catch (err) {
    await update({ status: "failed", error: (err as Error).message }).catch(() => {});
  }
}

// List jobs for a deck
articleJobRoutes.get("/decks/:deckId/article-jobs", async (c) => {
  const deckId = parseInt(c.req.param("deckId") ?? "", 10);
  if (isNaN(deckId)) return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } }, 400);
  try {
    if (!(await deckExists(getDb(c), deckId))) return notFound(c, "Deck not found");
    const jobs = await getDb(c).select().from(articleJobs).where(eq(articleJobs.deckId, deckId)).orderBy(articleJobs.createdAt);
    return c.json({ jobs: jobs.map(mapJob) });
  } catch (err) {
    return serverError(c, "Failed to list article jobs");
  }
});

// List suggested topics for a deck
articleJobRoutes.get("/decks/:deckId/topics", async (c) => {
  const deckId = parseInt(c.req.param("deckId") ?? "", 10);
  if (isNaN(deckId)) return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } }, 400);
  try {
    if (!(await deckExists(getDb(c), deckId))) return notFound(c, "Deck not found");
    const allDecks = await getDb(c).query.decks.findMany();
    const ids: number[] = [deckId];
    const stack = [deckId];
    while (stack.length) {
      const current = stack.pop()!;
      const children = allDecks.filter((d) => d.parentId === current).map((d) => d.id);
      for (const child of children) {
        ids.push(child);
        stack.push(child);
      }
    }
    const rows = await getDb(c).select({ front: cardsTable.front, back: cardsTable.back, tags: cardsTable.tags })
      .from(cardsTable)
      .where(inArray(cardsTable.deckId, ids));
    return c.json({ topics: getDeckTopics(rows) });
  } catch (err) {
    return serverError(c, "Failed to compute topics");
  }
});

// Create a job
articleJobRoutes.post("/decks/:deckId/article-jobs", async (c) => {
  const deckId = parseInt(c.req.param("deckId") ?? "", 10);
  let body: any = {};
  try { body = await c.req.json(); } catch { /* no body */ }
  const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
  if (isNaN(deckId)) return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } }, 400);
  if (!topic || topic.length > 500) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Topic is required (max 500 chars)" } }, 400);
  }
  try {
    if (!(await deckExists(getDb(c), deckId))) return notFound(c, "Deck not found");
    const id = crypto.randomUUID();
    const now = new Date();
    const [job] = await getDb(c).insert(articleJobs).values({
      id,
      deckId,
      topic,
      status: "pending",
      progress: 0,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const ctx = c.executionCtx as any;
    const run = runArticleJob(c.env, id, deckId, topic).catch((err) => console.error(JSON.stringify({ err: (err as Error).message })));
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(run);
    else run.catch(() => {});

    return c.json({ job: mapJob(job) }, 202);
  } catch (err) {
    return serverError(c, "Failed to create article job");
  }
});

// Get a single job
articleJobRoutes.get("/article-jobs/:id", async (c) => {
  try {
    const job = await getDb(c).query.articleJobs.findFirst({ where: eq(articleJobs.id, c.req.param("id")) });
    if (!job) return notFound(c, "Job not found");
    return c.json(mapJob(job));
  } catch (err) {
    return serverError(c, "Failed to get article job");
  }
});

// Delete a job
articleJobRoutes.delete("/article-jobs/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const job = await getDb(c).query.articleJobs.findFirst({ where: eq(articleJobs.id, id) });
    if (!job) return notFound(c, "Job not found");
    await getDb(c).delete(articleJobs).where(eq(articleJobs.id, id));
    return new Response(null, { status: 204 });
  } catch (err) {
    return serverError(c, "Failed to delete article job");
  }
});

// SSE stream — poll the DB row and emit named `status` events (no in-memory bus on Workers).
articleJobRoutes.get("/article-jobs/:id/stream", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        let job = await db.query.articleJobs.findFirst({ where: eq(articleJobs.id, id) });
        if (!job) {
          controller.close();
          return;
        }
        const mapped = mapJob(job);
        const outline = mapped.outline ? JSON.parse(mapped.outline) : undefined;
        send("status", {
          status: mapped.status,
          progress: mapped.progress,
          outline,
          content: mapped.content,
          final: mapped.status === "completed" || mapped.status === "failed",
          error: mapped.error,
        });

        if (mapped.status === "completed" || mapped.status === "failed") {
          controller.close();
          return;
        }

        const deadline = Date.now() + 10 * 60 * 1000;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 1500));
          job = await db.query.articleJobs.findFirst({ where: eq(articleJobs.id, id) });
          if (!job) break;
          const m = mapJob(job);
          const o = m.outline ? JSON.parse(m.outline) : undefined;
          send("status", {
            status: m.status,
            progress: m.progress,
            outline: o,
            content: m.content,
            final: m.status === "completed" || m.status === "failed",
            error: m.error,
          });
          if (m.status === "completed" || m.status === "failed") break;
        }
        controller.close();
      } catch {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
