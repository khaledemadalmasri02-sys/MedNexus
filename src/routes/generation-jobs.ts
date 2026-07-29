import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import type { AppEnv } from "../types";
import type { DB } from "../db/index";
import { generationJobs, decks, cards, createDb } from "../db/index";
import { getDb, getUserId, notFound, serverError, insertBatched } from "../lib/helpers";
import { createAIService } from "../lib/ai";
import { offlineGenerator } from "../lib/offline-generator";
import type { GeneratedCard, GeneratedQuestion, GenerateOptions } from "../lib/ai";
import { captureGenerationError } from "../lib/error-capture";

export const generationJobRoutes = new Hono<AppEnv>();

interface MappedJob {
  id: string;
  userId: string | null;
  type: "cards" | "questions";
  status: "pending" | "processing" | "completed" | "failed";
  text: string | null;
  count: number;
  options?: GenerateOptions;
  result?: any;
  error?: string;
  retryCount: number;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

function mapJob(row: typeof generationJobs.$inferSelect): MappedJob {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as "cards" | "questions",
    status: row.status as "pending" | "processing" | "completed" | "failed",
    text: row.text,
    count: row.count ?? 10,
    options: row.options ? JSON.parse(row.options) : undefined,
    result: row.result ? JSON.parse(row.result) : undefined,
    error: row.error ?? undefined,
    retryCount: row.retryCount ?? 0,
    priority: row.priority ?? 0,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

function isAuthError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes("401") ||
    message.includes("402") ||
    message.includes("429") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("bad gateway") ||
    message.includes("unauthorized") ||
    message.includes("api key") ||
    message.includes("user not found") ||
    message.includes("authentication") ||
    message.includes("invalid url") ||
    message.includes("provider returned error") ||
    message.includes("rate limit") ||
    message.includes("quota") ||
    message.includes("too many requests") ||
    message.includes("temporarily unavailable") ||
    message.includes("ai request failed") ||
    message.includes("ai api error") ||
    message.includes("fetch failed") ||
    message.includes("econnrefused") ||
    message.includes("enotfound")
  );
}

function isParseError(error: Error): boolean {
  return /invalid response format|no json|parse/i.test(error.message);
}

function normalizeQbankItem(q: GeneratedQuestion): GeneratedQuestion {
  const choices = Array.isArray(q.choices) ? q.choices.filter((c) => typeof c === "string") : [];
  while (choices.length < 3) choices.push(`Option ${choices.length + 1}`);
  let correctIndex = typeof q.correctIndex === "number" ? q.correctIndex : 0;
  if (correctIndex < 0 || correctIndex >= choices.length || !choices[correctIndex]) correctIndex = 0;
  return { ...q, front: q.front || "", back: q.back || "", choices, correctIndex };
}

function tryGenerate(
  ai: ReturnType<typeof createAIService>,
  type: "cards" | "questions",
  text: string,
  count: number,
  options?: GenerateOptions
): Promise<GeneratedCard[] | GeneratedQuestion[]> {
  if (type === "questions") {
    return ai.generateQuestions(text, count, options);
  }
  return ai.generateCards(text, count, options);
}

function offlineGenerate(
  type: "cards" | "questions",
  text: string,
  count: number
): GeneratedCard[] | GeneratedQuestion[] {
  if (type === "questions") {
    return offlineGenerator.generateQuestions(text, count);
  }
  return offlineGenerator.generateCards(text, count);
}

async function runGenerationJob(env: AppEnv["Bindings"], job: typeof generationJobs.$inferSelect) {
  const db = createDb(env.DB);
  const ai = createAIService(env);

  const update = (patch: Partial<typeof generationJobs.$inferInsert>) =>
    db.update(generationJobs).set({ ...patch, updatedAt: new Date() }).where(eq(generationJobs.id, job.id));

  await update({ status: "processing" });

  try {
    const type = job.type as "cards" | "questions";
    const text = job.text || "";
    const count = job.count ?? 10;
    const options: GenerateOptions = job.options ? JSON.parse(job.options) : {};

    let generatedItems: GeneratedCard[] | GeneratedQuestion[] = [];
    let usedOfflineFallback = false;

    try {
      generatedItems = await tryGenerate(ai, type, text, count, options);
    } catch (aiErr) {
      const err = aiErr as Error;
      if (isAuthError(err) || isParseError(err)) {
        usedOfflineFallback = true;
        await captureGenerationError(db, err as Error, {
          userId: job.userId,
          operation: `generation-job:${type}`,
          model: "unknown",
          inputText: text,
          extra: { jobId: job.id, fallback: "offline" },
        });
        generatedItems = offlineGenerate(type, text, count) as GeneratedCard[] | GeneratedQuestion[];
      } else {
        throw err;
      }
    }

    const result = generatedItems.map((item) => ({
      front: item.front,
      back: item.back,
      tags: "tags" in item ? (item as any).tags : undefined,
      choices: "choices" in item ? (item as GeneratedQuestion).choices : undefined,
      correctIndex: "correctIndex" in item ? (item as GeneratedQuestion).correctIndex : undefined,
      explanation: "explanation" in item ? (item as GeneratedQuestion).explanation : undefined,
    }));

    await update({
      status: "completed",
      result: JSON.stringify(result),
    });
  } catch (err) {
    const errorMsg = (err as Error).message;
    await update({
      status: "failed",
      error: errorMsg,
    });
    await captureGenerationError(db, err as Error, {
      userId: job.userId,
      operation: `generation-job:${job.type}`,
      model: "unknown",
      inputText: job.text || "",
      extra: { jobId: job.id, retryCount: job.retryCount, count: job.count },
    });
  }
}

generationJobRoutes.get("/", async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ jobs: [] });
    }
    const jobs = await getDb(c)
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.userId, userId))
      .orderBy(desc(generationJobs.createdAt));
    return c.json({ jobs: jobs.map(mapJob) });
  } catch (err) {
    return serverError(c, "Failed to list generation jobs");
  }
});

generationJobRoutes.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const userId = getUserId(c);
    const job = await getDb(c).query.generationJobs.findFirst({
      where: (t: any, { and, eq }: any) =>
        and(eq(t.id, id), userId ? eq(t.userId, userId) : undefined),
    });
    if (!job) return notFound(c, "Job not found");
    if (userId && job.userId !== userId) return c.json({ error: { code: "FORBIDDEN", message: "Access denied" } }, 403);
    return c.json(mapJob(job));
  } catch (err) {
    return serverError(c, "Failed to get generation job");
  }
});

generationJobRoutes.post("/", async (c) => {
  const body = await c.req.json<{
    type: "cards" | "questions";
    text: string;
    count?: number;
    options?: GenerateOptions;
    priority?: number;
  }>();

  if (!body.type || !["cards", "questions"].includes(body.type)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Type must be 'cards' or 'questions'" } }, 400);
  }
  if (!body.text || typeof body.text !== "string") {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Text content is required" } }, 400);
  }

  try {
    const userId = getUserId(c);
    const id = crypto.randomUUID();
    const now = new Date();
    const count = Math.max(1, Math.min(body.count ?? 10, 100));

    const [job] = await getDb(c).insert(generationJobs).values({
      id,
      userId,
      type: body.type,
      status: "pending",
      text: body.text,
      count,
      options: body.options ? JSON.stringify(body.options) : undefined,
      priority: body.priority ?? 0,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const ctx = c.executionCtx as any;
    const run = runGenerationJob(c.env, job).catch((err) => console.error(JSON.stringify({ err: (err as Error).message })));
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(run);
    else run.catch(() => {});

    return c.json({ job: mapJob(job) }, 202);
  } catch (err) {
    return serverError(c, "Failed to create generation job");
  }
});

generationJobRoutes.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const userId = getUserId(c);
    const job = await getDb(c).query.generationJobs.findFirst({ where: eq(generationJobs.id, id) });
    if (!job) return notFound(c, "Job not found");
    if (userId && job.userId !== userId) return c.json({ error: { code: "FORBIDDEN", message: "Access denied" } }, 403);
    await getDb(c).delete(generationJobs).where(eq(generationJobs.id, id));
    return new Response(null, { status: 204 });
  } catch (err) {
    return serverError(c, "Failed to delete generation job");
  }
});

generationJobRoutes.get("/:id/stream", async (c) => {
  const accept = c.req.header("accept") || "";
  if (!accept.includes("text/event-stream")) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Client must accept text/event-stream" } }, 406);
  }

  const id = c.req.param("id");
  const db = getDb(c);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        let job = await db.query.generationJobs.findFirst({ where: eq(generationJobs.id, id) });
        if (!job) {
          controller.close();
          return;
        }
        const mapped = mapJob(job);
        send("status", {
          status: mapped.status,
          result: mapped.result,
          error: mapped.error,
          final: mapped.status === "completed" || mapped.status === "failed",
        });

        if (mapped.status === "completed" || mapped.status === "failed") {
          controller.close();
          return;
        }

        const deadline = Date.now() + 10 * 60 * 1000;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 1500));
          job = await db.query.generationJobs.findFirst({ where: eq(generationJobs.id, id) });
          if (!job) break;
          const m = mapJob(job);
          send("status", {
            status: m.status,
            result: m.result,
            error: m.error,
            final: m.status === "completed" || m.status === "failed",
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