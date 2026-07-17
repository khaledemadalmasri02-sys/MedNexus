import type { Context } from "hono";
import type { AppEnv } from "../types";
import type { DB } from "../db/index";

// D1 caps a single statement at ~100 bound parameters. Inserting many rows
// in one `values([...])` call (cards × columns) can exceed that and throw
// "too many SQL variables". This inserts in safe batches and returns all rows.
export async function insertBatched<T extends Record<string, unknown>>(
  db: DB,
  table: any,
  rows: T[],
  batchSize = 10,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const inserted = await db.insert(table).values(chunk).returning();
    out.push(...(inserted as T[]));
  }
  return out;
}

// Standard accessors used by every route module.
export function getDb(c: Context<AppEnv>): DB {
  return c.get("db")!;
}

export function getUserId(c: Context<AppEnv>): string | null {
  return c.get("user")?.id ?? null;
}

export function getUser(c: Context<AppEnv>) {
  return c.get("user") ?? null;
}

export function isAuthenticated(c: Context<AppEnv>): boolean {
  return !!c.get("user");
}

// Standard error envelope matching the original Express API.
export function errorJson(c: Context<AppEnv>, status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return c.json({ error: { code, message, ...(extra || {}) } }, status as any);
}

export function unauthorized(c: Context<AppEnv>) {
  return errorJson(c, 401, "UNAUTHORIZED", "Authentication required");
}

export function notFound(c: Context<AppEnv>, message = "Not found") {
  return errorJson(c, 404, "NOT_FOUND", message);
}

export function serverError(c: Context<AppEnv>, message = "Internal server error") {
  return errorJson(c, 500, "INTERNAL_ERROR", message);
}

// Client IP for free-tier / rate-limit identifiers.
export function clientIp(c: Context<AppEnv>): string {
  return c.req.header("cf-connecting-ip") || "unknown";
}

// Build a streaming SSE Response from an async generator of text deltas.
export function sseFromGenerator(gen: AsyncGenerator<string>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of gen) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// Parse JSON body safely.
export async function readJson<T = any>(c: Context<AppEnv>): Promise<T> {
  try {
    return (await c.req.json()) as T;
  } catch {
    return {} as T;
  }
}
