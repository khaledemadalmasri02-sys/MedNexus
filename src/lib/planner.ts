import { db, studyPlanInstances, notifications } from "../db/index.js";
import { eq, and, isNull, gte, lte, sql } from "drizzle-orm";
import type { StudyPlan } from "../db/schema.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Convert a JS getDay() value (0=Sun..6=Sat) to planner weekday (0=Mon..6=Sun). */
export function toPlannerDow(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

/** Local calendar date as yyyy-mm-dd (avoids UTC drift from toISOString in +offset zones). */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Next occurrence (local date + datetime at midnight) of a plan's weekday. */
export function nextOccurrence(dayOfWeek: number, weeksAhead = 0): { date: string; datetime: Date } {
  const now = new Date();
  const adjustedToday = toPlannerDow(now.getDay());
  const diff = (dayOfWeek - adjustedToday + 7) % 7;
  const datetime = new Date(now);
  datetime.setDate(now.getDate() + diff + weeksAhead * 7);
  datetime.setHours(0, 0, 0, 0);
  return { date: localDateKey(datetime), datetime };
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
      const adjusted = toPlannerDow(dt.getDay());
      rows.push({
        planId: plan.id,
        userId: plan.userId,
        occurrenceDate: localDateKey(dt),
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
      message: `"${plan.title}" starts at ${String(plan.startHour).padStart(2, "0")}:00 — ${leadMinutes} min reminder.`,
      actionUrl: "/planner",
      scheduledAt: reminderAt,
      createdAt: reminderAt,
    });
  } else {
    // recurring: schedule a heads-up for the next occurrence at lead time
    const { datetime } = nextOccurrence(plan.dayOfWeek);
    datetime.setHours(plan.startHour, 0, 0, 0);
    const reminderAt = new Date(datetime.getTime() - leadMinutes * 60 * 1000);
    if (reminderAt.getTime() < Date.now()) return; // next occurrence already within lead window
    await db.insert(notifications).values({
      userId: plan.userId,
      type: "study_reminder",
      title: "Recurring session reminder",
      message: `"${plan.title}" (${plan.recurrence}) starts at ${String(plan.startHour).padStart(2, "0")}:00 — ${leadMinutes} min reminder.`,
      actionUrl: "/planner",
      scheduledAt: reminderAt,
      createdAt: reminderAt,
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
    if (p.recurrence === "daily") {
      // occurs every day → count toward all 7 weekdays
      for (let dow = 0; dow < 7; dow++) {
        plannedByDow.set(dow, (plannedByDow.get(dow) || 0) + p.durationMinutes);
      }
    } else if (p.recurrence === "weekly") {
      plannedByDow.set(p.dayOfWeek, (plannedByDow.get(p.dayOfWeek) || 0) + p.durationMinutes);
    }
    // one-time ("none") plans have no recurring weekday baseline → skip
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
    const key = localDateKey(new Date(s.startedAt));
    const cur = actualByDate.get(key) || { minutes: 0, count: 0 };
    cur.minutes += s.durationMinutes || 0;
    cur.count += 1;
    actualByDate.set(key, cur);
  }

  const result: StreakHistoryDay[] = [];
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
    // Floating local time (no Z) so the event shows at the user's wall-clock time.
    const fmtLocal = (d: Date) =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}T` +
      `${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
    // DTSTAMP is a genuine UTC timestamp.
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
