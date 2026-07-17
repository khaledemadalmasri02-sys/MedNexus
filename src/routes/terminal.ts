import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { AppEnv } from "../types";
import { terminalSessions } from "../db/index";
import { getDb, getUserId, unauthorized, notFound, serverError } from "../lib/helpers";

export const terminalRoutes = new Hono<AppEnv>();

function safeEqual(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

// POST /api/terminal/sessions — create a session record (no real workspace).
terminalRoutes.post("/terminal/sessions", async (c) => {
  try {
    let body: any = {};
    try { body = await c.req.json(); } catch { /* no body */ }
    const workspaceId = (body.workspaceId as string) || "default";
    const userId = getUserId(c);
    const sessionId = crypto.randomUUID();
    const now = new Date();
    await getDb(c).insert(terminalSessions).values({
      id: sessionId,
      userId: userId ?? null,
      workspaceId,
      status: "active",
      createdAt: now,
      lastActivityAt: now,
    });
    return c.json({ sessionId, workspaceId, createdAt: now }, 201);
  } catch (err) {
    return serverError(c, "Failed to create terminal session");
  }
});

// GET /api/terminal/sessions/:id
terminalRoutes.get("/terminal/sessions/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const session = await getDb(c).query.terminalSessions.findFirst({ where: eq(terminalSessions.id, id) });
    if (!session) return notFound(c, "Session not found");
    return c.json({
      id: session.id,
      workspaceId: session.workspaceId,
      createdAt: session.createdAt,
      lastActivity: session.lastActivityAt,
    });
  } catch (err) {
    return serverError(c, "Failed to get terminal session");
  }
});

// GET /api/terminal/sessions — admin list of all sessions.
terminalRoutes.get("/terminal/sessions", async (c) => {
  const adminKey = c.req.header("x-admin-key");
  const secret = c.env.ADMIN_SECRET_KEY;
  if (!secret || !adminKey || !safeEqual(adminKey, secret)) {
    return c.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, 403);
  }
  try {
    const rows = await getDb(c).select().from(terminalSessions).orderBy(terminalSessions.createdAt);
    return c.json({ sessions: rows, count: rows.length });
  } catch (err) {
    return serverError(c, "Failed to list terminal sessions");
  }
});

// POST /api/terminal/exec — STUBBED (shell exec cannot run on Workers).
terminalRoutes.post("/terminal/exec", (c) => {
  return c.json(
    { error: { code: "NOT_SUPPORTED", message: "Terminal shell execution is not available on this deployment" } },
    501,
  );
});

// GET /api/terminal/files — STUBBED (filesystem cannot run on Workers).
terminalRoutes.get("/terminal/files", (c) => {
  return c.json(
    { error: { code: "NOT_SUPPORTED", message: "Terminal filesystem access is not available on this deployment" } },
    501,
  );
});

// GET /api/terminal/files/content — STUBBED.
terminalRoutes.get("/terminal/files/content", (c) => {
  return c.json(
    { error: { code: "NOT_SUPPORTED", message: "Terminal filesystem access is not available on this deployment" } },
    501,
  );
});

// POST /api/terminal/files/content — STUBBED.
terminalRoutes.post("/terminal/files/content", (c) => {
  return c.json(
    { error: { code: "NOT_SUPPORTED", message: "Terminal filesystem access is not available on this deployment" } },
    501,
  );
});

// DELETE /api/terminal/sessions/:id — close/delete a session record.
terminalRoutes.delete("/terminal/sessions/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const result = await getDb(c).delete(terminalSessions).where(eq(terminalSessions.id, id));
    const deleted = (result as any)?.changes ?? 0;
    if (!deleted) return notFound(c, "Session not found");
    return new Response(null, { status: 204 });
  } catch (err) {
    return serverError(c, "Failed to delete terminal session");
  }
});
