import { Router, Request, Response } from "express";
import { db, studySessions, decks } from "../db/index.js";
import { eq, and, isNull, sql, gte, lte, desc } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { validateBody } from "../middleware/validate.js";
import { startStudySessionSchema, updateStudySessionSchema, endStudySessionSchema } from "./validators.js";

const router = Router();

function getUserId(req: Request): string | null {
  return req.isAuthenticated() ? req.user!.id : null;
}

// ── POST /api/study-sessions — start a session ──
router.post("/", validateBody(startStudySessionSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { planId, deckId } = req.body;

    const [session] = await db.insert(studySessions).values({
      userId,
      planId: planId || null,
      deckId: deckId || null,
      startedAt: new Date(),
      cardsStudied: 0,
      createdAt: new Date(),
    }).returning();

    res.status(201).json(session);
  } catch (err) {
    logger.error({ err }, "Failed to start study session");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to start study session" } });
  }
});

// ── PATCH /api/study-sessions/:id — update progress ──
router.patch("/:id", validateBody(updateStudySessionSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const sessionId = parseInt(req.params.id, 10);
    if (isNaN(sessionId)) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
      return;
    }

    const existing = await db.query.studySessions.findFirst({
      where: eq(studySessions.id, sessionId),
    });
    if (!existing || (userId && existing.userId !== userId) || (!userId && existing.userId !== null)) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Session not found" } });
      return;
    }

    const { cardsStudied, knownCount, unknownCount } = req.body;

    const [updated] = await db.update(studySessions).set({
      cardsStudied: cardsStudied !== undefined ? cardsStudied : existing.cardsStudied,
      knownCount: knownCount !== undefined ? knownCount : existing.knownCount,
      unknownCount: unknownCount !== undefined ? unknownCount : existing.unknownCount,
    }).where(eq(studySessions.id, sessionId)).returning();

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update study session");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update study session" } });
  }
});

// ── POST /api/study-sessions/:id/end ──
router.post("/:id/end", validateBody(endStudySessionSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const sessionId = parseInt(req.params.id, 10);
    if (isNaN(sessionId)) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
      return;
    }

    const existing = await db.query.studySessions.findFirst({
      where: eq(studySessions.id, sessionId),
    });
    if (!existing || (userId && existing.userId !== userId) || (!userId && existing.userId !== null)) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Session not found" } });
      return;
    }

    const endedAt = new Date();
    const durationMs = endedAt.getTime() - new Date(existing.startedAt).getTime();
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    const { cardsStudied, knownCount, unknownCount, focusRating } = req.body;

    const [updated] = await db.update(studySessions).set({
      endedAt,
      durationMinutes,
      cardsStudied: cardsStudied !== undefined ? cardsStudied : existing.cardsStudied,
      knownCount: knownCount !== undefined ? knownCount : existing.knownCount,
      unknownCount: unknownCount !== undefined ? unknownCount : existing.unknownCount,
      focusRating: focusRating !== undefined ? focusRating : existing.focusRating,
    }).where(eq(studySessions.id, sessionId)).returning();

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to end study session");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to end study session" } });
  }
});

// ── GET /api/study-sessions/stats ──
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const sessions = await db.query.studySessions.findMany({
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

    res.json({
      totalMinutes: totalMinutes,
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
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get study session stats" } });
  }
});

// ── GET /api/study-sessions/history ──
router.get("/history", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const sessions = await db.query.studySessions.findMany({
      where: userId ? eq(studySessions.userId, userId) : isNull(studySessions.userId),
      limit,
      offset,
      orderBy: desc(studySessions.startedAt),
    });

    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(studySessions).where(
      userId ? eq(studySessions.userId, userId) : isNull(studySessions.userId),
    );

    res.json({
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
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get study session history" } });
  }
});

// ── GET /api/study-sessions/focus-average?days=120 — avg focus rating ──
router.get("/focus-average", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const days = Math.min(parseInt(req.query.days as string) || 120, 365);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const [result] = await db
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

    res.json({ average: result?.avg ?? null, count: result?.count ?? 0, days });
  } catch (err) {
    logger.error({ err }, "Failed to get focus average");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get focus average" } });
  }
});

// ── GET /api/study-sessions/recent — recent sessions with deck names ──
router.get("/recent", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const sessions = await db.select({
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

    res.json({ sessions });
  } catch (err) {
    logger.error({ err }, "Failed to get recent sessions");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get recent sessions" } });
  }
});

// ── GET /api/study-sessions/summary ──
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sessions = await db.query.studySessions.findMany({
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

    res.json({
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
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get study session summary" } });
  }
});

export default router;
