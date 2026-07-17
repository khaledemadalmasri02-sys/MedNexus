import { Hono } from "hono";
import { eq, and, sql, desc } from "drizzle-orm";
import type { AppEnv } from "../types";
import { users, errorLogs, feedback } from "../db/index";
import { getDb, serverError } from "../lib/helpers";
import { z } from "zod";

export const adminRoutes = new Hono<AppEnv>();

const resolveErrorSchema = z.object({
  resolution_notes: z.string().min(1),
  fix_pattern: z.string().min(1),
});

adminRoutes.get("/admin/stats", async (c) => {
  try {
    const db = getDb(c);
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [errorCount] = await db.select({ count: sql<number>`count(*)` }).from(errorLogs);
    const [unresolvedCount] = await db.select({ count: sql<number>`count(*)` }).from(errorLogs).where(eq(errorLogs.resolved, false));
    const [feedbackCount] = await db.select({ count: sql<number>`count(*)` }).from(feedback);

    return c.json({
      totalUsers: userCount?.count || 0,
      totalErrors: errorCount?.count || 0,
      unresolvedErrors: unresolvedCount?.count || 0,
      totalFeedback: feedbackCount?.count || 0,
    });
  } catch (err) {
    return serverError(c, "Failed to get stats");
  }
});

adminRoutes.get("/admin/users", async (c) => {
  try {
    const db = getDb(c);
    const limit = Math.min(parseInt(c.req.query("limit") || "") || 50, 200);
    const offset = parseInt(c.req.query("offset") || "") || 0;

    const allUsers = await db.select().from(users).limit(limit).offset(offset).orderBy(desc(users.createdAt));
    const [count] = await db.select({ count: sql<number>`count(*)` }).from(users);

    return c.json({ users: allUsers, total: count?.count || 0, limit, offset });
  } catch (err) {
    return serverError(c, "Failed to list users");
  }
});

adminRoutes.get("/admin/users/:id", async (c) => {
  try {
    const db = getDb(c);
    const userId = c.req.param("id");
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return c.json({ error: { code: "NOT_FOUND", message: "User not found" } }, 404);
    }
    return c.json(user);
  } catch (err) {
    return serverError(c, "Failed to get user");
  }
});

adminRoutes.delete("/admin/users/:id", async (c) => {
  try {
    const db = getDb(c);
    const userId = c.req.param("id");
    await db.delete(users).where(eq(users.id, userId));
    return c.json({ success: true });
  } catch (err) {
    return serverError(c, "Failed to delete user");
  }
});

adminRoutes.get("/admin/errors", async (c) => {
  try {
    const db = getDb(c);
    const limit = Math.min(parseInt(c.req.query("limit") || "") || 50, 200);
    const offset = parseInt(c.req.query("offset") || "") || 0;
    const resolved = c.req.query("resolved");
    const model = c.req.query("model");

    const conditions = [] as any[];
    if (resolved === "true") conditions.push(eq(errorLogs.resolved, true));
    else if (resolved === "false") conditions.push(eq(errorLogs.resolved, false));
    if (model) conditions.push(eq(errorLogs.model, model));

    const errors = await db.select().from(errorLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(errorLogs.createdAt));
    const [count] = await db.select({ count: sql<number>`count(*)` }).from(errorLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({ errors, total: count?.count || 0, limit, offset });
  } catch (err) {
    return serverError(c, "Failed to list errors");
  }
});

adminRoutes.post("/admin/errors/:id/resolve", async (c) => {
  try {
    const db = getDb(c);
    const errorId = parseInt(c.req.param("id") || "", 10);
    if (isNaN(errorId)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid error ID" } }, 400);
    }

    let body: any = {};
    try { body = await c.req.json(); } catch { /* no body */ }
    const validation = resolveErrorSchema.safeParse(body);
    if (!validation.success) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "resolution_notes and fix_pattern required" } }, 400);
    }

    await db.update(errorLogs).set({
      resolved: true,
      resolutionNotes: validation.data.resolution_notes,
      fixPattern: validation.data.fix_pattern,
    }).where(eq(errorLogs.id, errorId));

    return c.json({ success: true, errorId });
  } catch (err) {
    return serverError(c, "Failed to resolve error");
  }
});

adminRoutes.delete("/admin/errors/resolved", async (c) => {
  try {
    const db = getDb(c);
    const deleted = await db.delete(errorLogs).where(eq(errorLogs.resolved, true)).returning();
    return c.json({ success: true, deleted: deleted.length || 0 });
  } catch (err) {
    return serverError(c, "Failed to clear resolved errors");
  }
});

adminRoutes.get("/admin/feedback", async (c) => {
  try {
    const db = getDb(c);
    const limit = Math.min(parseInt(c.req.query("limit") || "") || 50, 200);
    const offset = parseInt(c.req.query("offset") || "") || 0;
    const type = c.req.query("type");

    const conditions = type ? eq(feedback.type, type) : undefined;

    const items = await db.select({
      id: feedback.id,
      userId: feedback.userId,
      type: feedback.type,
      message: feedback.message,
      rating: feedback.rating,
      createdAt: feedback.createdAt,
      userEmail: users.email,
    }).from(feedback)
      .leftJoin(users, eq(feedback.userId, users.id))
      .where(conditions)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(feedback.createdAt));

    const [count] = await db.select({ count: sql<number>`count(*)` }).from(feedback).where(conditions);

    return c.json({ items, total: count?.count || 0, limit, offset });
  } catch (err) {
    return serverError(c, "Failed to list feedback");
  }
});

adminRoutes.delete("/admin/feedback/:id", async (c) => {
  try {
    const db = getDb(c);
    const feedbackId = parseInt(c.req.param("id") || "", 10);
    if (isNaN(feedbackId)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
    }
    await db.delete(feedback).where(eq(feedback.id, feedbackId));
    return c.json({ success: true });
  } catch (err) {
    return serverError(c, "Failed to delete feedback");
  }
});
