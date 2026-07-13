import { Router, Request, Response } from "express";
import { db, studyPlans, studySessions, decks, studyPlanInstances } from "../db/index.js";
import { eq, and, isNull, inArray, desc } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { validateBody } from "../middleware/validate.js";
import { createPlannerSchema, updatePlannerSchema, expandPlannerSchema } from "./validators.js";
import {
  detectOverlaps,
  conflictedIds,
  expandRecurringPlan,
  createReminderNotification,
  computeStreakHistory,
  buildWeekIcs,
} from "../lib/planner.js";

const router = Router();

function getUserId(req: Request): string | null {
  return req.isAuthenticated() ? req.user!.id : null;
}

function planOwnerFilter(userId: string | null) {
  return userId ? eq(studyPlans.userId, userId) : isNull(studyPlans.userId);
}

async function getPlanById(planId: number, userId: string | null) {
  const plan = await db.query.studyPlans.findFirst({
    where: eq(studyPlans.id, planId),
  });
  if (!plan) return null;
  if (userId && plan.userId !== userId) return null;
  if (!userId && plan.userId !== null) return null;
  return plan;
}

// ── GET /api/planners — list all plans for user, optional ?day=0-6 filter ──
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const day = req.query.day !== undefined ? parseInt(req.query.day as string, 10) : undefined;

    const conditions = [planOwnerFilter(userId)];
    if (day !== undefined && !isNaN(day)) {
      conditions.push(eq(studyPlans.dayOfWeek, day));
    }

    const plans = await db.query.studyPlans.findMany({
      where: and(...conditions),
    });

     // Attach deck name if deck_id is set
    const deckIds = [...new Set(plans.filter(p => p.deckId).map(p => p.deckId!))];
    const deckMap = new Map<number, string>();
    if (deckIds.length > 0) {
      const deckRecords = await db.select({ id: decks.id, name: decks.name }).from(decks).where(inArray(decks.id, deckIds));
      deckRecords.forEach(d => deckMap.set(d.id, d.name));
    }

    const result = plans.map(p => ({
      ...p,
      deckName: p.deckId ? deckMap.get(p.deckId) || null : null,
      duration: p.durationMinutes,
    }));

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to list planners");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list planners" } });
  }
});

// ── GET /api/planners/today ──
router.get("/today", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const todayIdx = new Date().getDay();
    const adjustedTodayIdx = todayIdx === 0 ? 6 : todayIdx - 1;

    const plans = await db.query.studyPlans.findMany({
      where: and(planOwnerFilter(userId), eq(studyPlans.dayOfWeek, adjustedTodayIdx)),
    });

    const deckIds = [...new Set(plans.filter(p => p.deckId).map(p => p.deckId!))];
    const deckMap = new Map<number, string>();
    if (deckIds.length > 0) {
      const deckRecords = await db.select({ id: decks.id, name: decks.name }).from(decks).where(inArray(decks.id, deckIds));
      deckRecords.forEach(d => deckMap.set(d.id, d.name));
    }

    const result = plans.map(p => ({
      ...p,
      deckName: p.deckId ? deckMap.get(p.deckId) || null : null,
      duration: p.durationMinutes,
    }));

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to get today's planners");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get today's planners" } });
  }
});

// ── GET /api/planners/week ──
router.get("/week", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const plans = await db.query.studyPlans.findMany({
      where: planOwnerFilter(userId),
    });

    const deckIds = [...new Set(plans.filter(p => p.deckId).map(p => p.deckId!))];
    const deckMap = new Map<number, string>();
    if (deckIds.length > 0) {
      const deckRecords = await db.select({ id: decks.id, name: decks.name }).from(decks).where(inArray(decks.id, deckIds));
      deckRecords.forEach(d => deckMap.set(d.id, d.name));
    }

    const totalSessions = plans.length;
    const completedSessions = plans.filter(p => p.completed).length;
    const totalMinutes = plans.reduce((s, p) => s + p.durationMinutes, 0);
    const completedMinutes = plans.filter(p => p.completed).reduce((s, p) => s + p.durationMinutes, 0);

    const perDay: Record<number, { total: number; completed: number }> = {};
    for (let i = 0; i < 7; i++) {
      const dayPlans = plans.filter(p => p.dayOfWeek === i);
      perDay[i] = {
        total: dayPlans.length,
        completed: dayPlans.filter(p => p.completed).length,
      };
    }

    const overlaps = detectOverlaps(plans);
    const conflicted = conflictedIds(overlaps);

    const result = plans.map(p => ({
      ...p,
      deckName: p.deckId ? deckMap.get(p.deckId) || null : null,
      duration: p.durationMinutes,
      hasConflict: conflicted.has(p.id),
    }));

    res.json({
      plans: result,
      conflicts: overlaps,
      stats: {
        totalSessions,
        completedSessions,
        totalMinutes,
        completedMinutes,
        perDay,
      },
    });
  } catch (err) {
    logger.error({ err }, "Failed to get week planners");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get week planners" } });
  }
});

// ── GET /api/planners/overlaps — detect overlapping sessions (same day/time) ──
router.get("/overlaps", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const plans = await db.query.studyPlans.findMany({ where: planOwnerFilter(userId) });
    const overlaps = detectOverlaps(plans);
    res.json({ overlaps, conflictedIds: [...conflictedIds(overlaps)] });
  } catch (err) {
    logger.error({ err }, "Failed to detect overlaps");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to detect overlaps" } });
  }
});

// ── GET /api/planners/instances?weeks=N — materialized recurring instances ──
router.get("/instances", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const weeks = Math.min(parseInt(req.query.weeks as string) || 4, 12);
    const userIdFilter = userId ? eq(studyPlanInstances.userId, userId) : isNull(studyPlanInstances.userId);
    const instances = await db.query.studyPlanInstances.findMany({
      where: userIdFilter,
      orderBy: desc(studyPlanInstances.occurrenceDate),
      limit: weeks * 7 * 4,
    });
    res.json(instances);
  } catch (err) {
    logger.error({ err }, "Failed to list plan instances");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list plan instances" } });
  }
});

// ── GET /api/planners/reminders — upcoming session reminders (next 24h) ──
router.get("/reminders", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const plans = await db.query.studyPlans.findMany({ where: planOwnerFilter(userId) });
    const now = new Date();
    const reminders = plans
      .map((p) => {
        const now = new Date();
        const jsToday = now.getDay();
        const adjustedToday = jsToday === 0 ? 6 : jsToday - 1;
        const diff = (p.dayOfWeek - adjustedToday + 7) % 7;
        const dt = new Date(now);
        dt.setDate(now.getDate() + diff);
        dt.setHours(p.startHour, 0, 0, 0);
        return { plan: p, at: dt };
      })
      .filter(({ at }) => at.getTime() >= now.getTime() && at.getTime() <= now.getTime() + 24 * 60 * 60 * 1000)
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .map(({ plan, at }) => ({
        id: plan.id,
        title: plan.title,
        dayOfWeek: plan.dayOfWeek,
        startHour: plan.startHour,
        durationMinutes: plan.durationMinutes,
        color: plan.color,
        at: at.toISOString(),
        leadMinutes: 15,
      }));
    res.json(reminders);
  } catch (err) {
    logger.error({ err }, "Failed to list reminders");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list reminders" } });
  }
});

// ── GET /api/planners/streak-history?days=120 — per-day completion ──
router.get("/streak-history", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const days = Math.min(parseInt(req.query.days as string) || 120, 365);
    const history = await computeStreakHistory(userId, days);
    res.json({ days: history });
  } catch (err) {
    logger.error({ err }, "Failed to get streak history");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get streak history" } });
  }
});

// ── GET /api/planners/export/ics — download current week as .ics ──
router.get("/export/ics", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const plans = await db.query.studyPlans.findMany({ where: planOwnerFilter(userId) });
    const now = new Date();
    const jsToday = now.getDay();
    const adjustedToday = jsToday === 0 ? 6 : jsToday - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - adjustedToday);
    weekStart.setHours(0, 0, 0, 0);
    const ics = buildWeekIcs(plans, weekStart);
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="mednexus-week.ics"');
    res.send(ics);
  } catch (err) {
    logger.error({ err }, "Failed to export ics");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to export ics" } });
  }
});

// ── POST /api/planners ──
router.post("/", validateBody(createPlannerSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { title, description, color, dayOfWeek, startHour, durationMinutes, deckId, recurrence } = req.body;

    if (!title || typeof dayOfWeek !== "number" || typeof startHour !== "number") {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "title, dayOfWeek, and startHour are required" } });
      return;
    }

    const [plan] = await db.insert(studyPlans).values({
      userId,
      title,
      description: description || null,
      color: color || "#06b6d4",
      dayOfWeek,
      startHour,
      durationMinutes: durationMinutes || 60,
      deckId: deckId || null,
      recurrence: recurrence || "none",
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    try {
      if (plan.recurrence && plan.recurrence !== "none") await expandRecurringPlan(plan);
      await createReminderNotification(plan);
    } catch (e) {
      logger.warn({ err: e }, "Failed to expand/notify plan (non-fatal)");
    }

    res.status(201).json({ ...plan, duration: plan.durationMinutes });
  } catch (err) {
    logger.error({ err }, "Failed to create planner");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create planner" } });
  }
});

// ── PATCH /api/planners/:id ──
router.patch("/:id", validateBody(updatePlannerSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const planId = parseInt(req.params.id, 10);
    if (isNaN(planId)) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
      return;
    }

    const existing = await getPlanById(planId, userId);
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found" } });
      return;
    }

    const { title, description, color, dayOfWeek, startHour, durationMinutes, deckId, recurrence } = req.body;

    const [updated] = await db.update(studyPlans).set({
      title: title ?? existing.title,
      description: description !== undefined ? description : existing.description,
      color: color ?? existing.color,
      dayOfWeek: dayOfWeek ?? existing.dayOfWeek,
      startHour: startHour ?? existing.startHour,
      durationMinutes: durationMinutes ?? existing.durationMinutes,
      deckId: deckId !== undefined ? deckId : existing.deckId,
      recurrence: recurrence ?? existing.recurrence,
      updatedAt: new Date(),
    }).where(and(eq(studyPlans.id, planId), planOwnerFilter(userId))).returning();

    try {
      if (updated.recurrence && updated.recurrence !== "none") await expandRecurringPlan(updated);
      await createReminderNotification(updated);
    } catch (e) {
      logger.warn({ err: e }, "Failed to expand/notify plan (non-fatal)");
    }

    res.json({ ...updated, duration: updated.durationMinutes });
  } catch (err) {
    logger.error({ err }, "Failed to update planner");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update planner" } });
  }
});

// ── DELETE /api/planners/:id ──
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const planId = parseInt(req.params.id, 10);
    if (isNaN(planId)) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
      return;
    }

    const existing = await getPlanById(planId, userId);
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found" } });
      return;
    }

    await db.delete(studyPlans).where(and(eq(studyPlans.id, planId), planOwnerFilter(userId)));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete planner");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete planner" } });
  }
});

// ── POST /api/planners/:id/expand — materialize recurring instances ──
router.post("/:id/expand", validateBody(expandPlannerSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const planId = parseInt(req.params.id, 10);
    if (isNaN(planId)) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
      return;
    }
    const existing = await getPlanById(planId, userId);
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found" } });
      return;
    }
    const weeks = req.body.weeks || 4;
    const count = await expandRecurringPlan(existing, weeks);
    res.json({ planId, weeks, created: count });
  } catch (err) {
    logger.error({ err }, "Failed to expand plan");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to expand plan" } });
  }
});

// ── POST /api/planners/:id/complete ──
router.post("/:id/complete", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const planId = parseInt(req.params.id, 10);
    if (isNaN(planId)) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
      return;
    }

    const existing = await getPlanById(planId, userId);
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found" } });
      return;
    }

    const [updated] = await db.update(studyPlans).set({
      completed: true,
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(studyPlans.id, planId), planOwnerFilter(userId))).returning();

    res.json({ ...updated, duration: updated.durationMinutes });
  } catch (err) {
    logger.error({ err }, "Failed to complete planner");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to complete planner" } });
  }
});

// ── POST /api/planners/:id/uncomplete ──
router.post("/:id/uncomplete", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const planId = parseInt(req.params.id, 10);
    if (isNaN(planId)) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
      return;
    }

    const existing = await getPlanById(planId, userId);
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found" } });
      return;
    }

    const [updated] = await db.update(studyPlans).set({
      completed: false,
      completedAt: null,
      updatedAt: new Date(),
    }).where(and(eq(studyPlans.id, planId), planOwnerFilter(userId))).returning();

    res.json({ ...updated, duration: updated.durationMinutes });
  } catch (err) {
    logger.error({ err }, "Failed to uncomplete planner");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to uncomplete planner" } });
  }
});

// ── GET /api/planners/streak ──
router.get("/streak", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const plans = await db.query.studyPlans.findMany({
      where: planOwnerFilter(userId),
    });

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dow = checkDate.getDay();
      const adjustedDow = dow === 0 ? 6 : dow - 1;

      const dayPlans = plans.filter(p => p.dayOfWeek === adjustedDow);
      if (dayPlans.length === 0) continue;

      const allCompleted = dayPlans.every(p => p.completed);
      if (allCompleted) {
        currentStreak++;
      } else {
        break;
      }
    }

    res.json({ currentStreak });
  } catch (err) {
    logger.error({ err }, "Failed to get streak");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get streak" } });
  }
});

export default router;
