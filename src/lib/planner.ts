import { db, studyPlanInstances, notifications } from "../db/index.js";
import { eq, and, isNull, gte, lte, sql } from "drizzle-orm";
import type { StudyPlan } from "../db/schema.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** ISO date (yyyy-mm-dd) for the next occurrence of a plan's weekday at startHour. */
function nextOccurrence(dayOfWeek: number, weeksAhead = 0): { date: string; datetime: Date } {
  const now = new Date();
  // JS getDay(): 0=Sun..6=Sat. Planner uses 0=Mon..6=Sun.
  const jsToday = now.getDay();
  const adjustedToday = jsToday === 0 ? 6 : jsToday - 1;
  let diff = (dayOfWeek - adjustedToday + 7) % 7;
  if (diff === 0) diff = 0; // today
  const date = new Date(now);
  date.setDate(now.getDate() + diff + weeksAhead * 7);
  date.setHours(0, 0, 0, 0);
  const datetime = new Date(date);
  datetime.setHours(0, 0, 0, 0);
  return { date: datetime.toISOString().split("T")[0], datetime };
}

export interface PlanOverlap {
  aId: number;
  bId: number;
  dayOfWeek: number;
  aTitle: string;
  bTitle: string;
}

function rangesOverlap(
  startA: number, durA: number, startB: number, durB: number,
): boolean {
  const aStart = startA * 60;
  const aEnd = aStart + durA;
  const bStart = startB * 60;
  const bEnd = bStart + durB;
  return aStart < bEnd && bStart < aEnd;
}

/** Detect overlapping plans sharing the same day/time. */
export function detectOverlaps(plans: Array<Pick<StudyPlan, "id" | "title" | "dayOfWeek" | "startHour" | "durationMinutes">>): PlanOverlap[] {
  const overlaps: PlanOverlap[] = [];
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

/** Set of plan ids that participate in at least one overlap. */
export function conflictedIds(overlaps: PlanOverlap[]): Set<number> {
  const set = new Set<number>();
  for (const o of overlaps) {
    set.add(o.aId);
    set.add(o.bId);
  }
  return set;
}

/** Materialize dated instances of a recurring plan for the next `weeks` weeks. Idempotent. */
export async function expandRecurringPlan(plan: StudyPlan, weeks = 4): Promise<number> {
  if (plan.recurrence === "none") return 0;
  await db.delete(studyPlanInstances).where(eq(studyPlanInstances.planId, plan.id));

  const rows: Array<{
    planId: number;
    userId: string | null;
    occurrenceDate: string;
    dayOfWeek: number;
    startHour: number;
    durationMinutes: number;
    title: string;
    description: string | null;
    color: string;
    deckId: number | null;
    createdAt: Date;
  }> = [];

  if (plan.recurrence === "weekly") {
    for (let w = 0; w < weeks; w++) {
      const { date, datetime } = nextOccurrence(plan.dayOfWeek, w);
      datetime.setHours(plan.startHour, 0, 0, 0);
      rows.push({
        planId: plan.id,
        userId: plan.userId,
        occurrenceDate: date,
        dayOfWeek: plan.dayOfWeek,
        startHour: plan.startHour,
        durationMinutes: plan.durationMinutes,
        title: plan.title,
        description: plan.description,
        color: plan.color,
        deckId: plan.deckId,
        createdAt: new Date(),
      });
    }
  } else if (plan.recurrence === "daily") {
    for (let d = 0; d < weeks * 7; d++) {
      const dt = new Date();
      dt.setDate(dt.getDate() + d);
      dt.setHours(plan.startHour, 0, 0, 0);
      const jsDay = dt.getDay();
      const adjusted = jsDay === 0 ? 6 : jsDay - 1;
      rows.push({
        planId: plan.id,
        userId: plan.userId,
        occurrenceDate: dt.toISOString().split("T")[0],
        dayOfWeek: adjusted,
        startHour: plan.startHour,
        durationMinutes: plan.durationMinutes,
        title: plan.title,
        description: plan.description,
        color: plan.color,
        deckId: plan.deckId,
        createdAt: new Date(),
      });
    }
  }

  if (rows.length === 0) return 0;
  await db.insert(studyPlanInstances).values(rows);
  return rows.length;
}

/** Create an in-app reminder notification wired into the existing bell system. */
export async function createReminderNotification(
  plan: StudyPlan,
  leadMinutes = 15,
): Promise<void> {
  if (plan.recurrence === "none") {
    const { datetime } = nextOccurrence(plan.dayOfWeek);
    datetime.setHours(plan.startHour, 0, 0, 0);
    const reminderAt = new Date(datetime.getTime() - leadMinutes * 60 * 1000);
    if (reminderAt.getTime() < Date.now()) return; // already passed
    await db.insert(notifications).values({
      userId: plan.userId,
      type: "study_reminder",
      title: "Study session soon",
      message: `"${plan.title}" starts at ${String(plan.startHour).padStart(2, "0")}:00 — ${leadMinutes} min reminder set.`,
      actionUrl: "/planner",
      createdAt: new Date(),
    });
  } else {
    // recurring: schedule a single heads-up for the next occurrence
    const { datetime } = nextOccurrence(plan.dayOfWeek);
    datetime.setHours(plan.startHour, 0, 0, 0);
    await db.insert(notifications).values({
      userId: plan.userId,
      type: "study_reminder",
      title: "Recurring session reminder",
      message: `"${plan.title}" (${plan.recurrence}) — we'll nudge you ${leadMinutes} min before each session.`,
      actionUrl: "/planner",
      createdAt: new Date(),
    });
  }
}

/** Per-day completion history derived from study_sessions over the last `days` days. */
export interface StreakHistoryDay {
  date: string;
  plannedMinutes: number;
  actualMinutes: number;
  sessionsCompleted: number;
  hasActivity: boolean;
}

export async function computeStreakHistory(
  userId: string | null,
  days = 120,
): Promise<StreakHistoryDay[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today.getTime() - (days - 1) * DAY_MS);

  // Planned minutes per day-of-week from study_plans
  const plans = await db.query.studyPlans.findMany({
    where: userId ? eq(sql`study_plans.user_id`, userId) : isNull(sql`study_plans.user_id`),
  });
  const plannedByDow = new Map<number, number>();
  for (const p of plans) {
    plannedByDow.set(p.dayOfWeek, (plannedByDow.get(p.dayOfWeek) || 0) + p.durationMinutes);
  }

  // Actual session minutes per date
  const sessions = await db.query.studySessions.findMany({
    where: and(
      userId ? eq(sql`study_sessions.user_id`, userId) : isNull(sql`study_sessions.user_id`),
      gte(sql`study_sessions.started_at`, start),
      lte(sql`study_sessions.started_at`, new Date(today.getTime() + DAY_MS)),
    ),
  });
  const actualByDate = new Map<string, { minutes: number; count: number }>();
  for (const s of sessions) {
    const key = new Date(s.startedAt).toISOString().split("T")[0];
    const cur = actualByDate.get(key) || { minutes: 0, count: 0 };
    cur.minutes += s.durationMinutes || 0;
    cur.count += 1;
    actualByDate.set(key, cur);
  }

  const result: StreakHistoryDay[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * DAY_MS);
    const key = d.toISOString().split("T")[0];
    const jsDay = d.getDay();
    const dow = jsDay === 0 ? 6 : jsDay - 1;
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

export function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Build an ICS calendar string for the given plans across the current week. */
export function buildWeekIcs(
  plans: Array<Pick<StudyPlan, "title" | "description" | "dayOfWeek" | "startHour" | "durationMinutes" | "color">>,
  weekStart: Date,
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MedNexus//StudyPlanner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const p of plans) {
    const dt = new Date(weekStart);
    dt.setDate(weekStart.getDate() + p.dayOfWeek);
    dt.setHours(p.startHour, 0, 0, 0);
    const end = new Date(dt.getTime() + p.durationMinutes * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${dt.getTime()}-${icsEscape(p.title)}@mednexus`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(dt)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${icsEscape(p.title)}`,
      p.description ? `DESCRIPTION:${icsEscape(p.description)}` : "",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}
