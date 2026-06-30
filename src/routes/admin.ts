import { Router, Request, Response } from "express";
import { db, users, errorLogs, feedback } from "../db/index.js";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import { z } from "zod";
import { logger } from "../lib/logger.js";

const router = Router();

router.use(requireAdmin);

const resolveErrorSchema = z.object({
  resolution_notes: z.string().min(1),
  fix_pattern: z.string().min(1),
});

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [errorCount] = await db.select({ count: sql<number>`count(*)` }).from(errorLogs);
    const [unresolvedCount] = await db.select({ count: sql<number>`count(*)` }).from(errorLogs).where(eq(errorLogs.resolved, false));
    const [feedbackCount] = await db.select({ count: sql<number>`count(*)` }).from(feedback);

    res.json({
      totalUsers: userCount?.count || 0,
      totalErrors: errorCount?.count || 0,
      unresolvedErrors: unresolvedCount?.count || 0,
      totalFeedback: feedbackCount?.count || 0,
    });
  } catch (err) {
    logger.error({ err }, "Admin stats failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get stats" } });
  }
});

router.get("/users", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const allUsers = await db.select().from(users).limit(limit).offset(offset).orderBy(desc(users.createdAt));
    const [count] = await db.select({ count: sql<number>`count(*)` }).from(users);

    res.json({ users: allUsers, total: count?.count || 0, limit, offset });
  } catch (err) {
    logger.error({ err }, "Admin list users failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list users" } });
  }
});

router.get("/users/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
      return;
    }
    res.json(user);
  } catch (err) {
    logger.error({ err }, "Admin get user failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get user" } });
  }
});

router.delete("/users/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    await db.delete(users).where(eq(users.id, userId));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Admin delete user failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete user" } });
  }
});

router.get("/errors", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const resolved = req.query.resolved as string | undefined;
    const model = req.query.model as string | undefined;

    const conditions = [];
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

    res.json({ errors, total: count?.count || 0, limit, offset });
  } catch (err) {
    logger.error({ err }, "Admin list errors failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list errors" } });
  }
});

router.post("/errors/:id/resolve", async (req: Request, res: Response) => {
  try {
    const errorId = parseInt(req.params.id, 10);
    if (isNaN(errorId)) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid error ID" } });
      return;
    }

    const validation = resolveErrorSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "resolution_notes and fix_pattern required" } });
      return;
    }

    await db.update(errorLogs).set({
      resolved: true,
      resolutionNotes: validation.data.resolution_notes,
      fixPattern: validation.data.fix_pattern,
    }).where(eq(errorLogs.id, errorId));

    res.json({ success: true, errorId });
  } catch (err) {
    logger.error({ err }, "Admin resolve error failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to resolve error" } });
  }
});

router.delete("/errors/resolved", async (_req: Request, res: Response) => {
  try {
    const result = await db.delete(errorLogs).where(eq(errorLogs.resolved, true));
    res.json({ success: true, deleted: result.changes || 0 });
  } catch (err) {
    logger.error({ err }, "Admin clear resolved errors failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to clear resolved errors" } });
  }
});

router.get("/feedback", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as string | undefined;

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

    res.json({ items, total: count?.count || 0, limit, offset });
  } catch (err) {
    logger.error({ err }, "Admin list feedback failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list feedback" } });
  }
});

router.delete("/feedback/:id", async (req: Request, res: Response) => {
  try {
    const feedbackId = parseInt(req.params.id, 10);
    if (isNaN(feedbackId)) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
      return;
    }
    await db.delete(feedback).where(eq(feedback.id, feedbackId));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Admin delete feedback failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete feedback" } });
  }
});

export default router;
