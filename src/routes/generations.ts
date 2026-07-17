import { Hono } from "hono";
import { eq, desc, and, isNull, sql } from "drizzle-orm";
import type { AppEnv } from "../types";
import { generationLogs, decks } from "../db/index";
import { getDb, getUserId } from "../lib/helpers";
import { logger } from "../lib/logger";

export const generationRoutes = new Hono<AppEnv>();

generationRoutes.get("/generations", async (c) => {
  try {
    const userId = getUserId(c);
    const limit = Math.min(parseInt(c.req.query("limit") || "") || 50, 100);
    const offset = parseInt(c.req.query("offset") || "") || 0;

    const whereClause = userId
      ? eq(generationLogs.userId, userId)
      : isNull(generationLogs.userId);

    const db = getDb(c);
    const logs = await db.select({
      id: generationLogs.id,
      type: generationLogs.type,
      model: generationLogs.model,
      promptTokens: generationLogs.promptTokens,
      completionTokens: generationLogs.completionTokens,
      durationMs: generationLogs.durationMs,
      success: generationLogs.success,
      errorMessage: generationLogs.errorMessage,
      createdAt: generationLogs.createdAt,
      deckName: decks.name,
      deckId: decks.id,
    })
      .from(generationLogs)
      .leftJoin(decks, eq(decks.userId, generationLogs.userId))
      .where(whereClause)
      .orderBy(desc(generationLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db.select({
      count: sql<number>`count(*)`,
    })
      .from(generationLogs)
      .where(whereClause);

    const total = countResult[0]?.count || 0;

    return c.json({
      generations: logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (err) {
    logger.error({ err }, "Failed to list generations");
    return c.json({
      error: { code: "INTERNAL_ERROR", message: "Failed to list generation history" },
    }, 500);
  }
});

generationRoutes.get("/generations/stats", async (c) => {
  try {
    const userId = getUserId(c);
    const whereClause = userId
      ? eq(generationLogs.userId, userId)
      : isNull(generationLogs.userId);

    const db = getDb(c);
    const stats = await db.select({
      totalGenerations: sql<number>`count(*)`,
      successfulGenerations: sql<number>`sum(case when ${generationLogs.success} = 1 then 1 else 0 end)`,
      failedGenerations: sql<number>`sum(case when ${generationLogs.success} = 0 then 1 else 0 end)`,
      totalDuration: sql<number>`sum(${generationLogs.durationMs})`,
      avgDuration: sql<number>`avg(${generationLogs.durationMs})`,
      totalTokens: sql<number>`sum(${generationLogs.promptTokens} + ${generationLogs.completionTokens})`,
    })
      .from(generationLogs)
      .where(whereClause);

    const byType = await db.select({
      type: generationLogs.type,
      count: sql<number>`count(*)`,
    })
      .from(generationLogs)
      .where(whereClause)
      .groupBy(generationLogs.type);

    return c.json({
      ...stats[0],
      byType,
    });
  } catch (err) {
    logger.error({ err }, "Failed to get generation stats");
    return c.json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get generation statistics" },
    }, 500);
  }
});

generationRoutes.delete("/generations", async (c) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json().catch(() => ({})) as any;
    const { before, type } = body;

    const conditions: any[] = [];

    if (userId) {
      conditions.push(eq(generationLogs.userId, userId));
    } else {
      conditions.push(isNull(generationLogs.userId));
    }

    if (type) {
      conditions.push(eq(generationLogs.type, type));
    }

    if (before) {
      const beforeDate = new Date(before);
      conditions.push(sql`${generationLogs.createdAt} < ${beforeDate}`);
    }

    await getDb(c).delete(generationLogs).where(and(...conditions));

    return new Response(null, { status: 204 });
  } catch (err) {
    logger.error({ err }, "Failed to clear generation history");
    return c.json({
      error: { code: "INTERNAL_ERROR", message: "Failed to clear generation history" },
    }, 500);
  }
});

generationRoutes.get("/generations/:id", async (c) => {
  const id = parseInt(c.req.param("id") ?? "", 10);
  if (isNaN(id)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
  }

  try {
    const userId = getUserId(c);

    const log = await getDb(c).query.generationLogs.findFirst({
      where: eq(generationLogs.id, id),
    });

    if (!log) {
      return c.json({ error: { code: "NOT_FOUND", message: "Generation not found" } }, 404);
    }

    if (log.userId !== userId) {
      return c.json({ error: { code: "FORBIDDEN", message: "Access denied" } }, 403);
    }

    return c.json(log);
  } catch (err) {
    logger.error({ err }, "Failed to get generation");
    return c.json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get generation details" },
    }, 500);
  }
});
