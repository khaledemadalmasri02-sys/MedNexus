import { Hono } from "hono";
import type { AppEnv } from "../types";
import { getUserId } from "../lib/helpers";

export const offlineRoutes = new Hono<AppEnv>();

// In-memory queue for offline items. Best-effort: does not persist across
// Worker isolates/cold starts (original comment noted a real queue is needed
// in production). Mirrors the original in-memory Map behavior.
interface OfflineQueueItem {
  id: string;
  userId: string | null;
  type: "generate" | "explain" | "extract";
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "completed" | "failed";
  result?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const offlineQueue: Map<string, OfflineQueueItem> = new Map();

function getUserIdSafe(c: any): string | null {
  return c.get("user")?.id ?? null;
}

// ── POST /api/offline/queue ──
offlineRoutes.post("/offline/queue", async (c) => {
  const body = await c.req.json().catch(() => ({} as any));
  const { type, payload } = body as any;

  if (!type || !payload) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Type and payload are required" } }, 400);
  }

  const validTypes = ["generate", "explain", "extract"];
  if (!validTypes.includes(type)) {
    return c.json({
      error: { code: "VALIDATION_ERROR", message: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
    }, 400);
  }

  try {
    const userId = getUserIdSafe(c);
    const id = crypto.randomUUID();

    const item: OfflineQueueItem = {
      id,
      userId,
      type,
      payload,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    offlineQueue.set(id, item);

    return c.json({ id, status: "pending", message: "Item queued for processing" }, 201);
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to queue item" } }, 500);
  }
});

// ── GET /api/offline/queue ──
offlineRoutes.get("/offline/queue", async (c) => {
  try {
    const userId = getUserIdSafe(c);
    const status = c.req.query("status");

    let items = Array.from(offlineQueue.values()).filter((item) => item.userId === userId);
    if (status) {
      items = items.filter((item) => item.status === status);
    }
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return c.json({ items, total: items.length });
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get queue" } }, 500);
  }
});

// ── GET /api/offline/queue/:id ──
offlineRoutes.get("/offline/queue/:id", async (c) => {
  const { id } = c.req.param();
  try {
    const userId = getUserIdSafe(c);
    const item = offlineQueue.get(id);
    if (!item) {
      return c.json({ error: { code: "NOT_FOUND", message: "Item not found" } }, 404);
    }
    if (item.userId !== userId) {
      return c.json({ error: { code: "FORBIDDEN", message: "Access denied" } }, 403);
    }
    return c.json(item);
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get queue item" } }, 500);
  }
});

// ── DELETE /api/offline/queue/:id ──
offlineRoutes.delete("/offline/queue/:id", async (c) => {
  const { id } = c.req.param();
  try {
    const userId = getUserIdSafe(c);
    const item = offlineQueue.get(id);
    if (!item) {
      return c.json({ error: { code: "NOT_FOUND", message: "Item not found" } }, 404);
    }
    if (item.userId !== userId) {
      return c.json({ error: { code: "FORBIDDEN", message: "Access denied" } }, 403);
    }
    offlineQueue.delete(id);
    return new Response(null, { status: 204 });
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete queue item" } }, 500);
  }
});

// ── PATCH /api/offline/queue/:id ──
offlineRoutes.patch("/offline/queue/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json().catch(() => ({} as any));
  const { status, result, error } = body as any;

  try {
    const userId = getUserIdSafe(c);
    const item = offlineQueue.get(id);
    if (!item) {
      return c.json({ error: { code: "NOT_FOUND", message: "Item not found" } }, 404);
    }
    if (item.userId !== userId) {
      return c.json({ error: { code: "FORBIDDEN", message: "Access denied" } }, 403);
    }
    if (status) item.status = status;
    if (result) item.result = result;
    if (error) item.error = error;
    item.updatedAt = new Date();
    offlineQueue.set(id, item);
    return c.json(item);
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to update queue item" } }, 500);
  }
});

// ── DELETE /api/offline/queue (clear completed/failed) ──
offlineRoutes.delete("/offline/queue", async (c) => {
  try {
    const userId = getUserIdSafe(c);
    for (const [qid, item] of offlineQueue.entries()) {
      if (item.userId === userId && (item.status === "completed" || item.status === "failed")) {
        offlineQueue.delete(qid);
      }
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to clear queue" } }, 500);
  }
});

// ── POST /api/offline/process ──
offlineRoutes.post("/offline/process", async (c) => {
  try {
    const pendingItems = Array.from(offlineQueue.values()).filter((item) => item.status === "pending");
    for (const item of pendingItems.slice(0, 5)) {
      item.status = "processing";
      item.updatedAt = new Date();
      offlineQueue.set(item.id, item);
    }
    return c.json({ processed: Math.min(pendingItems.length, 5), total: pendingItems.length });
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to process queue" } }, 500);
  }
});
