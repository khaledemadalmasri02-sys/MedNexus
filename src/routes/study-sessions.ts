import { Hono } from "hono";
import { eq, and, isNull, sql, gte, desc } from "drizzle-orm";
import { z } from "zod";
import type { AppEnv } from "../types";
import type { DB } from "../db/index";
import { studySessions, decks } from "../db/index";
import { validate } from "../middleware/validate";
import { logger } from "../lib/logger";

export const studySessionRoutes = new Hono<AppEnv>();

function getDb(c: any): DB { return c.get("db"); }
function getUserId(c: any): string | null { return c.get("user")?.id ?? null; }

const startStudySessionSchema = z.object({
  planId: z.number().int().positive().optional(),
  deckId: z.number().int().positive().optional(),
});

const updateStudySessionSchema = z.object({
  cardsStudied: z.number().int().min(0).optional(),
  knownCount: z.number().int().min(0).optional(),
  unknownCount: z.number().int().min(0).optional(),
});

const endStudySessionSchema = z.object({
  cardsStudied: z.number().int().min(0).optional(),
  knownCount: z.number().int().min(0).optional(),
  unknownCount: z.number().int().min(0).optional(),
  focusRating: z.number().int().min(1).max(5).optional(),
});

// ── POST /api/study-sessions ──
studySessionRoutes.post("/study-sessions", validate(startStudySessionSchema), async (c) => {
  try {
    const userId = getUserId(c);
    const { planId, deckId } = c.get("validated") as any;

    const [session] = await getDb(c).insert(studySessions).values({
      userId,
      planId: planId || null,
      deckId: deckId || null,
      startedAt: new Date(),
      cardsStudied: 0,
      createdAt: new Date(),
    }).returning();

    return c.json(session, 201);
  } catch (err) {
    logger.error({ err }, "Failed to start study session");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to start study session" } }, 500);
  }
});

// ── PATCH /api/study-sessions/:id ──
studySessionRoutes.patch("/study-sessions/:id", validate(updateStudySessionSchema), async (c) => {
  try {
    const userId = getUserId(c);
    const sessionId = parseInt(c.req.param("id") ?? "", 10);
    if (isNaN(sessionId)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
    }

    const existing = await getDb(c).query.studySessions.findFirst({ where: eq(studySessions.id, sessionId) });
    if (!existing || (userId && existing.userId !== userId) || (!userId && existing.userId !== null)) {
      return c.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, 404);
    }

    const { cardsStudied, knownCount, unknownCount } = c.get("validated") as any;

    const [updated] = await getDb(c).update(studySessions).set({
      cardsStudied: cardsStudied !== undefined ? cardsStudied : existing.cardsStudied,
      knownCount: knownCount !== undefined ? knownCount : existing.knownCount,
      unknownCount: unknownCount !== undefined ? unknownCount : existing.unknownCount,
    }).where(eq(studySessions.id, sessionId)).returning();

    return c.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update study session");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to update study session" } }, 500);
  }
});

// ── POST /api/study-sessions/:id/end ──
studySessionRoutes.post("/study-sessions/:id/end", validate(endStudySessionSchema), async (c) => {
  try {
    const userId = getUserId(c);
    const sessionId = parseInt(c.req.param("id") ?? "", 10);
    if (isNaN(sessionId)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
    }

    const existing = await getDb(c).query.studySessions.findFirst({ where: eq(studySessions.id, sessionId) });
    if (!existing || (userId && existing.userId !== userId) || (!userId && existing.userId !== null)) {
      return c.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, 404);
    }

    const endedAt = new Date();
    const durationMs = endedAt.getTime() - new Date(existing.startedAt).getTime();
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    const { cardsStudied, knownCount, unknownCount, focusRating } = c.get("validated") as any;

    const [updated] = await getDb(c).update(studySessions).set({
      endedAt,
      durationMinutes,
      cardsStudied: cardsStudied !== undefined ? cardsStudied : existing.cardsStudied,
      knownCount: knownCount !== undefined ? knownCount : existing.knownCount,
      unknownCount: unknownCount !== undefined ? unknownCount : existing.unknownCount,
      focusRating: focusRating !== undefined ? focusRating : existing.focusRating,
    }).where(eq(studySessions.id, sessionId)).returning();

    return c.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to end study session");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to end study session" } }, 500);
  }
});

// ── GET /api/study-sessions/stats ──
studySessionRoutes.get("/study-sessions/stats", async (c) => {
  try {
    const userId = getUserId(c);

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const sessions = await getDb(c).query.studySessions.findMany({
      where: and(
        userId ? eq(studySessions.userId, userId) : isNull(studySessions.userId),
        gte(studySessions.startedAt, weekStart),
      ),
    });

    const totalMinutes = sessions.reduce((s, sess) => s + (sess.durationMinutes || 0), 0);
    const totalSessions = sessions.length;
    const avgSessionMin = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;

    const dailyBreakdown: Record<string, { minutes: number; sessions: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      dailyBreakdown[key] = { minutes: 0, sessions: 0 };
    }

    for (const sess of sessions) {
      const key = new Date(sess.startedAt).toISOString().split("T")[0];
      if (dailyBreakdown[key]) {
        dailyBreakdown[key].minutes += sess.durationMinutes || 0;
        dailyBreakdown[key].sessions += 1;
      }
    }

    return c.json({
      totalMinutes,
      totalSessions,
      avgSessionMin,
      dailyBreakdown: Object.entries(dailyBreakdown).map(([date, data]) => ({
        date,
        minutes: data.minutes,
        sessions: data.sessions,
      })),
    });
  } catch (err) {
    logger.error({ err }, "Failed to get study session stats");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get study session stats" } }, 500);
  }
});

// ── GET /api/study-sessions/history ──
studySessionRoutes.get("/study-sessions/history", async (c) => {
  try {
    const userId = getUserId(c);
    const limit = Math.min(parseInt(c.req.query("limit") as string) || 20, 100);
    const offset = parseInt(c.req.query("offset") as string) || 0;

    const sessions = await getDb(c).query.studySessions.findMany({
      where: userId ? eq(studySessions.userId, userId) : isNull(studySessions.userId),
      limit,
      offset,
      orderBy: (studySessions, { desc: d }) => d(studySessions.startedAt),
    });

    const [countResult] = await getDb(c).select({ count: sql<number>`count(*)` }).from(studySessions).where(
      userId ? eq(studySessions.userId, userId) : isNull(studySessions.userId),
    );

    return c.json({
      sessions,
      pagination: {
        total: countResult?.count || 0,
        limit,
        offset,
        hasMore: offset + limit < (countResult?.count || 0),
      },
    });
  } catch (err) {
    logger.error({ err }, "Failed to get study session history");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get study session history" } }, 500);
  }
});

// ── GET /api/study-sessions/focus-average ──
studySessionRoutes.get("/study-sessions/focus-average", async (c) => {
  try {
    const userId = getUserId(c);
    const days = Math.min(parseInt(c.req.query("days") as string) || 120, 365);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const [result] = await getDb(c)
      .select({
        avg: sql<number | null>`avg(${studySessions.focusRating})`,
        count: sql<number>`count(${studySessions.focusRating})`,
      })
      .from(studySessions)
      .where(
        and(
          userId ? eq(studySessions.userId, userId) : isNull(studySessions.userId),
          gte(studySessions.startedAt, start),
          sql`${studySessions.focusRating} IS NOT NULL`,
        ),
      );

    return c.json({ average: result?.avg ?? null, count: result?.count ?? 0, days });
  } catch (err) {
    logger.error({ err }, "Failed to get focus average");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get focus average" } }, 500);
  }
});

// ── GET /api/study-sessions/recent ──
studySessionRoutes.get("/study-sessions/recent", async (c) => {
  try {
    const userId = getUserId(c);
    const limit = Math.min(parseInt(c.req.query("limit") as string) || 10, 50);

    const sessions = await getDb(c).select({
      id: studySessions.id,
      deckId: studySessions.deckId,
      deckName: decks.name,
      startedAt: studySessions.startedAt,
      endedAt: studySessions.endedAt,
      durationMinutes: studySessions.durationMinutes,
      cardsStudied: studySessions.cardsStudied,
      knownCount: studySessions.knownCount,
      unknownCount: studySessions.unknownCount,
    })
      .from(studySessions)
      .leftJoin(decks, eq(decks.id, studySessions.deckId))
      .where(userId ? eq(studySessions.userId, userId) : isNull(studySessions.userId))
      .orderBy(desc(studySessions.startedAt))
      .limit(limit);

    return c.json({ sessions });
  } catch (err) {
    logger.error({ err }, "Failed to get recent sessions");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get recent sessions" } }, 500);
  }
});

// ── GET /api/study-sessions/summary ──
studySessionRoutes.get("/study-sessions/summary", async (c) => {
  try {
    const userId = getUserId(c);
    const days = parseInt(c.req.query("days") as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sessions = await getDb(c).query.studySessions.findMany({
      where: and(
        userId ? eq(studySessions.userId, userId) : isNull(studySessions.userId),
        gte(studySessions.startedAt, startDate),
      ),
    });

    const totalMinutes = sessions.reduce((s, sess) => s + (sess.durationMinutes || 0), 0);
    const sessionsCount = sessions.length;

    const dailyBreakdown: Record<string, { minutes: number; sessions: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      dailyBreakdown[key] = { minutes: 0, sessions: 0 };
    }

    for (const sess of sessions) {
      const key = new Date(sess.startedAt).toISOString().split("T")[0];
      if (dailyBreakdown[key]) {
        dailyBreakdown[key].minutes += sess.durationMinutes || 0;
        dailyBreakdown[key].sessions += 1;
      }
    }

    return c.json({
      totalMinutes,
      sessionsCount,
      dailyBreakdown: Object.entries(dailyBreakdown).map(([date, data]) => ({
        date,
        minutes: data.minutes,
        sessions: data.sessions,
      })),
    });
  } catch (err) {
    logger.error({ err }, "Failed to get study session summary");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get study session summary" } }, 500);
  }
});
