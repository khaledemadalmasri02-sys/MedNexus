import { Hono } from "hono";
import { eq, and, isNull, inArray, desc, gte, lte } from "drizzle-orm";
import { z } from "zod";
import type { AppEnv } from "../types";
import type { DB } from "../db/index";
import { studyPlans, studySessions, decks, studyPlanInstances, notifications } from "../db/index";
import { validate } from "../middleware/validate";
import { logger } from "../lib/logger";

export const plannerRoutes = new Hono<AppEnv>();

function getDb(c: any): DB { return c.get("db"); }
function getUserId(c: any): string | null { return c.get("user")?.id ?? null; }

function planOwnerFilter(userId: string | null) {
  return userId ? eq(studyPlans.userId, userId) : isNull(studyPlans.userId);
}

async function getPlanById(db: DB, planId: number, userId: string | null) {
  const plan = await db.query.studyPlans.findFirst({ where: eq(studyPlans.id, planId) });
  if (!plan) return null;
  if (userId && plan.userId !== userId) return null;
  if (!userId && plan.userId !== null) return null;
  return plan;
}

// ── Inline reimplementation of ../lib/planner helpers (original used a shared lib) ──
const DAY_MS = 24 * 60 * 60 * 1000;

function toPlannerDow(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nextOccurrence(dayOfWeek: number, weeksAhead = 0): { date: string; datetime: Date } {
  const now = new Date();
  const adjustedToday = toPlannerDow(now.getDay());
  const diff = (dayOfWeek - adjustedToday + 7) % 7;
  const datetime = new Date(now);
  datetime.setDate(now.getDate() + diff + weeksAhead * 7);
  datetime.setHours(0, 0, 0, 0);
  return { date: localDateKey(datetime), datetime };
}

function rangesOverlap(startA: number, durA: number, startB: number, durB: number): boolean {
  const aStart = startA * 60;
  const aEnd = aStart + durA;
  const bStart = startB * 60;
  const bEnd = bStart + durB;
  return aStart < bEnd && bStart < aEnd;
}

function detectOverlaps(plans: Array<{ id: number; title: string; dayOfWeek: number; startHour: number; durationMinutes: number }>): Array<{ aId: number; bId: number; dayOfWeek: number; aTitle: string; bTitle: string }> {
  const overlaps: Array<{ aId: number; bId: number; dayOfWeek: number; aTitle: string; bTitle: string }> = [];
  for (let i = 0; i < plans.length; i++) {
    for (let j = i + 1; j < plans.length; j++) {
      const a = plans[i];
      const b = plans[j];
      if (a.dayOfWeek !== b.dayOfWeek) continue;
      if (rangesOverlap(a.startHour, a.durationMinutes, b.startHour, b.durationMinutes)) {
        overlaps.push({ aId: a.id, bId: b.id, dayOfWeek: a.dayOfWeek, aTitle: a.title, bTitle: b.title });
      }
    }
  }
  return overlaps;
}

function conflictedIds(overlaps: Array<{ aId: number; bId: number }>): Set<number> {
  const set = new Set<number>();
  for (const o of overlaps) {
    set.add(o.aId);
    set.add(o.bId);
  }
  return set;
}

async function expandRecurringPlan(db: DB, plan: any, weeks = 4): Promise<number> {
  if (plan.recurrence === "none") return 0;
  await db.delete(studyPlanInstances).where(eq(studyPlanInstances.planId, plan.id));

  const rows: Array<{
    planId: number; userId: string | null; occurrenceDate: string; dayOfWeek: number;
    startHour: number; durationMinutes: number; title: string; description: string | null;
    color: string; deckId: number | null; createdAt: Date;
  }> = [];

  if (plan.recurrence === "weekly") {
    for (let w = 0; w < weeks; w++) {
      const { date, datetime } = nextOccurrence(plan.dayOfWeek, w);
      datetime.setHours(plan.startHour, 0, 0, 0);
      rows.push({
        planId: plan.id, userId: plan.userId, occurrenceDate: date, dayOfWeek: plan.dayOfWeek,
        startHour: plan.startHour, durationMinutes: plan.durationMinutes, title: plan.title,
        description: plan.description, color: plan.color, deckId: plan.deckId, createdAt: new Date(),
      });
    }
  } else if (plan.recurrence === "daily") {
    for (let d = 0; d < weeks * 7; d++) {
      const dt = new Date();
      dt.setDate(dt.getDate() + d);
      dt.setHours(plan.startHour, 0, 0, 0);
      const adjusted = toPlannerDow(dt.getDay());
      rows.push({
        planId: plan.id, userId: plan.userId, occurrenceDate: localDateKey(dt), dayOfWeek: adjusted,
        startHour: plan.startHour, durationMinutes: plan.durationMinutes, title: plan.title,
        description: plan.description, color: plan.color, deckId: plan.deckId, createdAt: new Date(),
      });
    }
  }

  if (rows.length === 0) return 0;
  await db.insert(studyPlanInstances).values(rows);
  return rows.length;
}

async function createReminderNotification(db: DB, plan: any, leadMinutes = 15): Promise<void> {
  if (plan.recurrence === "none") {
    const { datetime } = nextOccurrence(plan.dayOfWeek);
    datetime.setHours(plan.startHour, 0, 0, 0);
    const reminderAt = new Date(datetime.getTime() - leadMinutes * 60 * 1000);
    if (reminderAt.getTime() < Date.now()) return;
    await db.insert(notifications).values({
      userId: plan.userId, type: "study_reminder", title: "Study session soon",
      message: `"${plan.title}" starts at ${String(plan.startHour).padStart(2, "0")}:00 — ${leadMinutes} min reminder.`,
      actionUrl: "/planner", scheduledAt: reminderAt, createdAt: reminderAt,
    });
  } else {
    const { datetime } = nextOccurrence(plan.dayOfWeek);
    datetime.setHours(plan.startHour, 0, 0, 0);
    const reminderAt = new Date(datetime.getTime() - leadMinutes * 60 * 1000);
    if (reminderAt.getTime() < Date.now()) return;
    await db.insert(notifications).values({
      userId: plan.userId, type: "study_reminder", title: "Recurring session reminder",
      message: `"${plan.title}" (${plan.recurrence}) starts at ${String(plan.startHour).padStart(2, "0")}:00 — ${leadMinutes} min reminder.`,
      actionUrl: "/planner", scheduledAt: reminderAt, createdAt: reminderAt,
    });
  }
}

async function computeStreakHistory(db: DB, userId: string | null, days = 120): Promise<Array<{ date: string; plannedMinutes: number; actualMinutes: number; sessionsCompleted: number; hasActivity: boolean }>> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today.getTime() - (days - 1) * DAY_MS);

  const plans = await db.query.studyPlans.findMany({
    where: userId ? eq(studyPlans.userId, userId) : isNull(studyPlans.userId),
  });
  const plannedByDow = new Map<number, number>();
  for (const p of plans) {
    if (p.recurrence === "daily") {
      for (let dow = 0; dow < 7; dow++) {
        plannedByDow.set(dow, (plannedByDow.get(dow) || 0) + p.durationMinutes);
      }
    } else if (p.recurrence === "weekly") {
      plannedByDow.set(p.dayOfWeek, (plannedByDow.get(p.dayOfWeek) || 0) + p.durationMinutes);
    }
  }

  const sessions = await db.query.studySessions.findMany({
    where: and(
      userId ? eq(studySessions.userId, userId) : isNull(studySessions.userId),
      gte(studySessions.startedAt, start),
      lte(studySessions.startedAt, new Date(today.getTime() + DAY_MS)),
    ),
  });
  const actualByDate = new Map<string, { minutes: number; count: number }>();
  for (const s of sessions) {
    const key = localDateKey(new Date(s.startedAt));
    const cur = actualByDate.get(key) || { minutes: 0, count: 0 };
    cur.minutes += s.durationMinutes || 0;
    cur.count += 1;
    actualByDate.set(key, cur);
  }

  const result: Array<{ date: string; plannedMinutes: number; actualMinutes: number; sessionsCompleted: number; hasActivity: boolean }> = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * DAY_MS);
    const key = localDateKey(d);
    const dow = toPlannerDow(d.getDay());
    const actual = actualByDate.get(key);
    result.push({
      date: key,
      plannedMinutes: plannedByDow.get(dow) || 0,
      actualMinutes: actual?.minutes || 0,
      sessionsCompleted: actual?.count || 0,
      hasActivity: (actual?.minutes || 0) > 0,
    });
  }
  return result;
}

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function buildWeekIcs(plans: Array<{ title: string; description: string | null; dayOfWeek: number; startHour: number; durationMinutes: number; color: string }>, weekStart: Date): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MedNexus//StudyPlanner//EN",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
  ];
  for (const p of plans) {
    const dt = new Date(weekStart);
    dt.setDate(weekStart.getDate() + p.dayOfWeek);
    dt.setHours(p.startHour, 0, 0, 0);
    const end = new Date(dt.getTime() + p.durationMinutes * 60 * 1000);
    const fmtLocal = (d: Date) =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}T` +
      `${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
    const fmtUtc = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${dt.getTime()}-${icsEscape(p.title)}@mednexus`,
      `DTSTAMP:${fmtUtc(new Date())}`,
      `DTSTART:${fmtLocal(dt)}`,
      `DTEND:${fmtLocal(end)}`,
      `SUMMARY:${icsEscape(p.title)}`,
      p.description ? `DESCRIPTION:${icsEscape(p.description)}` : "",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}

const createPlannerSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  color: z.string().max(20).optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  startHour: z.number().int().min(0).max(23),
  durationMinutes: z.number().int().positive().max(480).optional(),
  deckId: z.number().int().positive().optional(),
  recurrence: z.enum(["none", "weekly", "daily"]).optional(),
});

const updatePlannerSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  color: z.string().max(20).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startHour: z.number().int().min(0).max(23).optional(),
  durationMinutes: z.number().int().positive().max(480).optional(),
  deckId: z.number().int().positive().nullable().optional(),
  recurrence: z.enum(["none", "weekly", "daily"]).optional(),
});

const expandPlannerSchema = z.object({
  weeks: z.number().int().min(1).max(12).optional(),
});

// ── GET /api/planners — list all plans ──
plannerRoutes.get("/planners", async (c) => {
  try {
    const userId = getUserId(c);
    const day = c.req.query("day") !== undefined ? parseInt(c.req.query("day") as string, 10) : undefined;

    const conditions = [planOwnerFilter(userId)];
    if (day !== undefined && !isNaN(day)) {
      conditions.push(eq(studyPlans.dayOfWeek, day));
    }

    const plans = await getDb(c).query.studyPlans.findMany({ where: and(...conditions) });

    const deckIds = [...new Set(plans.filter((p) => p.deckId).map((p) => p.deckId!))];
    const deckMap = new Map<number, string>();
    if (deckIds.length > 0) {
      const deckRecords = await getDb(c).select({ id: decks.id, name: decks.name }).from(decks).where(inArray(decks.id, deckIds));
      deckRecords.forEach((d) => deckMap.set(d.id, d.name));
    }

    const result = plans.map((p) => ({
      ...p,
      deckName: p.deckId ? deckMap.get(p.deckId) || null : null,
      duration: p.durationMinutes,
    }));

    return c.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to list planners");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to list planners" } }, 500);
  }
});

// ── GET /api/planners/today ──
plannerRoutes.get("/planners/today", async (c) => {
  try {
    const userId = getUserId(c);
    const todayIdx = new Date().getDay();
    const adjustedTodayIdx = toPlannerDow(todayIdx);

    const plans = await getDb(c).query.studyPlans.findMany({
      where: and(planOwnerFilter(userId), eq(studyPlans.dayOfWeek, adjustedTodayIdx)),
    });

    const deckIds = [...new Set(plans.filter((p) => p.deckId).map((p) => p.deckId!))];
    const deckMap = new Map<number, string>();
    if (deckIds.length > 0) {
      const deckRecords = await getDb(c).select({ id: decks.id, name: decks.name }).from(decks).where(inArray(decks.id, deckIds));
      deckRecords.forEach((d) => deckMap.set(d.id, d.name));
    }

    const result = plans.map((p) => ({
      ...p,
      deckName: p.deckId ? deckMap.get(p.deckId) || null : null,
      duration: p.durationMinutes,
    }));

    return c.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to get today's planners");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get today's planners" } }, 500);
  }
});

// ── GET /api/planners/week ──
plannerRoutes.get("/planners/week", async (c) => {
  try {
    const userId = getUserId(c);
    const plans = await getDb(c).query.studyPlans.findMany({ where: planOwnerFilter(userId) });

    const deckIds = [...new Set(plans.filter((p) => p.deckId).map((p) => p.deckId!))];
    const deckMap = new Map<number, string>();
    if (deckIds.length > 0) {
      const deckRecords = await getDb(c).select({ id: decks.id, name: decks.name }).from(decks).where(inArray(decks.id, deckIds));
      deckRecords.forEach((d) => deckMap.set(d.id, d.name));
    }

    const totalSessions = plans.length;
    const completedSessions = plans.filter((p) => p.completed).length;
    const totalMinutes = plans.reduce((s, p) => s + p.durationMinutes, 0);
    const completedMinutes = plans.filter((p) => p.completed).reduce((s, p) => s + p.durationMinutes, 0);

    const perDay: Record<number, { total: number; completed: number }> = {};
    for (let i = 0; i < 7; i++) {
      const dayPlans = plans.filter((p) => p.dayOfWeek === i);
      perDay[i] = { total: dayPlans.length, completed: dayPlans.filter((p) => p.completed).length };
    }

    const overlaps = detectOverlaps(plans);
    const conflicted = conflictedIds(overlaps);

    const result = plans.map((p) => ({
      ...p,
      deckName: p.deckId ? deckMap.get(p.deckId) || null : null,
      duration: p.durationMinutes,
      hasConflict: conflicted.has(p.id),
    }));

    return c.json({
      plans: result,
      conflicts: overlaps,
      stats: { totalSessions, completedSessions, totalMinutes, completedMinutes, perDay },
    });
  } catch (err) {
    logger.error({ err }, "Failed to get week planners");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get week planners" } }, 500);
  }
});

// ── GET /api/planners/overlaps ──
plannerRoutes.get("/planners/overlaps", async (c) => {
  try {
    const userId = getUserId(c);
    const plans = await getDb(c).query.studyPlans.findMany({ where: planOwnerFilter(userId) });
    const overlaps = detectOverlaps(plans);
    return c.json({ overlaps, conflictedIds: [...conflictedIds(overlaps)] });
  } catch (err) {
    logger.error({ err }, "Failed to detect overlaps");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to detect overlaps" } }, 500);
  }
});

// ── GET /api/planners/instances ──
plannerRoutes.get("/planners/instances", async (c) => {
  try {
    const userId = getUserId(c);
    const weeks = Math.min(parseInt(c.req.query("weeks") as string) || 4, 12);
    const userIdFilter = userId ? eq(studyPlanInstances.userId, userId) : isNull(studyPlanInstances.userId);
    const instances = await getDb(c).query.studyPlanInstances.findMany({
      where: userIdFilter,
      orderBy: (studyPlanInstances, { desc: d }) => d(studyPlanInstances.occurrenceDate),
      limit: weeks * 7 * 4,
    });
    return c.json(instances);
  } catch (err) {
    logger.error({ err }, "Failed to list plan instances");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to list plan instances" } }, 500);
  }
});

// ── GET /api/planners/reminders ──
plannerRoutes.get("/planners/reminders", async (c) => {
  try {
    const userId = getUserId(c);
    const plans = await getDb(c).query.studyPlans.findMany({ where: planOwnerFilter(userId) });
    const now = new Date();
    const reminders = plans
      .map((p) => {
        const { datetime } = nextOccurrence(p.dayOfWeek);
        datetime.setHours(p.startHour, 0, 0, 0);
        return { plan: p, at: datetime };
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
    return c.json(reminders);
  } catch (err) {
    logger.error({ err }, "Failed to list reminders");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to list reminders" } }, 500);
  }
});

// ── GET /api/planners/streak-history ──
plannerRoutes.get("/planners/streak-history", async (c) => {
  try {
    const userId = getUserId(c);
    const days = Math.min(parseInt(c.req.query("days") as string) || 120, 365);
    const history = await computeStreakHistory(getDb(c), userId, days);
    return c.json({ days: history });
  } catch (err) {
    logger.error({ err }, "Failed to get streak history");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get streak history" } }, 500);
  }
});

// ── GET /api/planners/export/ics ──
plannerRoutes.get("/planners/export/ics", async (c) => {
  try {
    const userId = getUserId(c);
    const plans = await getDb(c).query.studyPlans.findMany({ where: planOwnerFilter(userId) });
    const now = new Date();
    const adjustedToday = toPlannerDow(now.getDay());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - adjustedToday);
    weekStart.setHours(0, 0, 0, 0);
    const ics = buildWeekIcs(plans, weekStart);
    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="mednexus-week.ics"',
      },
    });
  } catch (err) {
    logger.error({ err }, "Failed to export ics");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to export ics" } }, 500);
  }
});

// ── POST /api/planners ──
plannerRoutes.post("/planners", validate(createPlannerSchema), async (c) => {
  try {
    const userId = getUserId(c);
    const { title, description, color, dayOfWeek, startHour, durationMinutes, deckId, recurrence } = c.get("validated") as any;

    if (!title || typeof dayOfWeek !== "number" || typeof startHour !== "number") {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "title, dayOfWeek, and startHour are required" } }, 400);
    }

    const [plan] = await getDb(c).insert(studyPlans).values({
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
      if (plan.recurrence && plan.recurrence !== "none") await expandRecurringPlan(getDb(c), plan);
      await createReminderNotification(getDb(c), plan);
    } catch (e) {
      logger.warn({ err: e }, "Failed to expand/notify plan (non-fatal)");
    }

    return c.json({ ...plan, duration: plan.durationMinutes }, 201);
  } catch (err) {
    logger.error({ err }, "Failed to create planner");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to create planner" } }, 500);
  }
});

// ── PATCH /api/planners/:id ──
plannerRoutes.patch("/planners/:id", validate(updatePlannerSchema), async (c) => {
  try {
    const userId = getUserId(c);
    const planId = parseInt(c.req.param("id") ?? "", 10);
    if (isNaN(planId)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
    }

    const existing = await getPlanById(getDb(c), planId, userId);
    if (!existing) {
      return c.json({ error: { code: "NOT_FOUND", message: "Plan not found" } }, 404);
    }

    const { title, description, color, dayOfWeek, startHour, durationMinutes, deckId, recurrence } = c.get("validated") as any;

    const [updated] = await getDb(c).update(studyPlans).set({
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
      if (updated.recurrence && updated.recurrence !== "none") await expandRecurringPlan(getDb(c), updated);
      await createReminderNotification(getDb(c), updated);
    } catch (e) {
      logger.warn({ err: e }, "Failed to expand/notify plan (non-fatal)");
    }

    return c.json({ ...updated, duration: updated.durationMinutes });
  } catch (err) {
    logger.error({ err }, "Failed to update planner");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to update planner" } }, 500);
  }
});

// ── DELETE /api/planners/:id ──
plannerRoutes.delete("/planners/:id", async (c) => {
  try {
    const userId = getUserId(c);
    const planId = parseInt(c.req.param("id") ?? "", 10);
    if (isNaN(planId)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
    }

    const existing = await getPlanById(getDb(c), planId, userId);
    if (!existing) {
      return c.json({ error: { code: "NOT_FOUND", message: "Plan not found" } }, 404);
    }

    await getDb(c).delete(studyPlans).where(and(eq(studyPlans.id, planId), planOwnerFilter(userId)));
    return new Response(null, { status: 204 });
  } catch (err) {
    logger.error({ err }, "Failed to delete planner");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete planner" } }, 500);
  }
});

// ── POST /api/planners/:id/expand ──
plannerRoutes.post("/planners/:id/expand", validate(expandPlannerSchema), async (c) => {
  try {
    const userId = getUserId(c);
    const planId = parseInt(c.req.param("id") ?? "", 10);
    if (isNaN(planId)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
    }
    const existing = await getPlanById(getDb(c), planId, userId);
    if (!existing) {
      return c.json({ error: { code: "NOT_FOUND", message: "Plan not found" } }, 404);
    }
    const weeks = (c.get("validated") as any)?.weeks || 4;
    const count = await expandRecurringPlan(getDb(c), existing, weeks);
    return c.json({ planId, weeks, created: count });
  } catch (err) {
    logger.error({ err }, "Failed to expand plan");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to expand plan" } }, 500);
  }
});

// ── POST /api/planners/:id/complete ──
plannerRoutes.post("/planners/:id/complete", async (c) => {
  try {
    const userId = getUserId(c);
    const planId = parseInt(c.req.param("id") ?? "", 10);
    if (isNaN(planId)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
    }

    const existing = await getPlanById(getDb(c), planId, userId);
    if (!existing) {
      return c.json({ error: { code: "NOT_FOUND", message: "Plan not found" } }, 404);
    }

    const [updated] = await getDb(c).update(studyPlans).set({
      completed: true,
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(studyPlans.id, planId), planOwnerFilter(userId))).returning();

    return c.json({ ...updated, duration: updated.durationMinutes });
  } catch (err) {
    logger.error({ err }, "Failed to complete planner");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to complete planner" } }, 500);
  }
});

// ── POST /api/planners/:id/uncomplete ──
plannerRoutes.post("/planners/:id/uncomplete", async (c) => {
  try {
    const userId = getUserId(c);
    const planId = parseInt(c.req.param("id") ?? "", 10);
    if (isNaN(planId)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
    }

    const existing = await getPlanById(getDb(c), planId, userId);
    if (!existing) {
      return c.json({ error: { code: "NOT_FOUND", message: "Plan not found" } }, 404);
    }

    const [updated] = await getDb(c).update(studyPlans).set({
      completed: false,
      completedAt: null,
      updatedAt: new Date(),
    }).where(and(eq(studyPlans.id, planId), planOwnerFilter(userId))).returning();

    return c.json({ ...updated, duration: updated.durationMinutes });
  } catch (err) {
    logger.error({ err }, "Failed to uncomplete planner");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to uncomplete planner" } }, 500);
  }
});

// ── GET /api/planners/streak ──
plannerRoutes.get("/planners/streak", async (c) => {
  try {
    const userId = getUserId(c);
    const plans = await getDb(c).query.studyPlans.findMany({ where: planOwnerFilter(userId) });

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dow = checkDate.getDay();
      const adjustedDow = toPlannerDow(dow);

      const dayPlans = plans.filter((p) => p.dayOfWeek === adjustedDow);
      if (dayPlans.length === 0) continue;

      const allCompleted = dayPlans.every((p) => p.completed);
      if (allCompleted) {
        currentStreak++;
      } else {
        break;
      }
    }

    return c.json({ currentStreak });
  } catch (err) {
    logger.error({ err }, "Failed to get streak");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get streak" } }, 500);
  }
});
