import { Router, Request, Response } from "express";
import { db, generationLogs, decks, cards } from "../db/index.js";
import { eq, desc, and, isNull, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router = Router();

// Get user ID from request
function getUserId(req: Request): string | null {
  return req.isAuthenticated() ? req.user!.id : null;
}

// List generation history
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    
    // Build query based on user
    const whereClause = userId 
      ? eq(generationLogs.userId, userId)
      : isNull(generationLogs.userId);
    
    // Get generation logs with deck info
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
    
    // Get total count
    const countResult = await db.select({
      count: sql<number>`count(*)`,
    })
    .from(generationLogs)
    .where(whereClause);
    
    const total = countResult[0]?.count || 0;
    
    res.json({
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
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to list generation history" },
    });
  }
});

// Get generation statistics
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const whereClause = userId 
      ? eq(generationLogs.userId, userId)
      : isNull(generationLogs.userId);
    
    // Get stats
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
    
    // Get by type
    const byType = await db.select({
      type: generationLogs.type,
      count: sql<number>`count(*)`,
    })
    .from(generationLogs)
    .where(whereClause)
    .groupBy(generationLogs.type);
    
    res.json({
      ...stats[0],
      byType,
    });
  } catch (err) {
    logger.error({ err }, "Failed to get generation stats");
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get generation statistics" },
    });
  }
});

// Clear generation history
router.delete("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { before, type } = req.body;
    
    // Build delete conditions
    const conditions = [];
    
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
    
    // Delete matching logs
    await db.delete(generationLogs).where(and(...conditions));
    
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to clear generation history");
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to clear generation history" },
    });
  }
});

// Get single generation details
router.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
    return;
  }
  
  try {
    const userId = getUserId(req);
    
    const log = await db.query.generationLogs.findFirst({
      where: eq(generationLogs.id, id),
    });
    
    if (!log) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Generation not found" } });
      return;
    }
    
    // Check ownership
    if (log.userId !== userId) {
      res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
      return;
    }
    
    res.json(log);
  } catch (err) {
    logger.error({ err }, "Failed to get generation");
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to get generation details" },
    });
  }
});

export default router;
