import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import type { AppEnv } from "../types";
import { errorLogs } from "../db/index";
import { getDb } from "../lib/helpers";
import { logger } from "../lib/logger";

export const errorRoutes = new Hono<AppEnv>();

// Minimal port of the original lib/error-learning ErrorLearningService.
// Kept inline (no shared lib) to avoid collisions with other porters.
// The Hono context is threaded through each method to avoid sharing request
// state across concurrent invocations.
class ErrorLearningService {
  async findSimilarErrors(c: any, operation: string, model: string, limit = 10) {
    try {
      const errors = await getDb(c).query.errorLogs.findMany({
        where: and(
          eq(errorLogs.operation, operation),
          eq(errorLogs.model, model),
          eq(errorLogs.resolved, false)
        ),
        orderBy: [desc(errorLogs.lastSeenAt)],
        limit,
      });
      return errors;
    } catch (err) {
      logger.error({ err }, "Failed to query similar errors");
      return [];
    }
  }

  async getErrorPatterns(c: any, model?: string, limit = 50) {
    try {
      const conditions = model
        ? and(eq(errorLogs.resolved, false), eq(errorLogs.model, model))
        : eq(errorLogs.resolved, false);

      const errors = await getDb(c).query.errorLogs.findMany({
        where: conditions,
        orderBy: [desc(errorLogs.occurrenceCount), desc(errorLogs.lastSeenAt)],
        limit,
      });
      return errors;
    } catch (err) {
      logger.error({ err }, "Failed to get error patterns");
      return [];
    }
  }

  async resolveError(c: any, errorId: number, resolutionNotes: string, fixPattern: string) {
    try {
      await getDb(c)
        .update(errorLogs)
        .set({ resolved: true, resolutionNotes, fixPattern })
        .where(eq(errorLogs.id, errorId));
      return true;
    } catch (err) {
      logger.error({ err }, "Failed to resolve error");
      return false;
    }
  }

  async bulkResolveByType(c: any, errorType: string, model: string, resolutionNotes: string, fixPattern: string) {
    try {
      const result: any = await getDb(c)
        .update(errorLogs)
        .set({ resolved: true, resolutionNotes, fixPattern })
        .where(and(
          eq(errorLogs.errorType, errorType),
          eq(errorLogs.model, model),
          eq(errorLogs.resolved, false)
        ));
      return result.changes || 0;
    } catch (err) {
      logger.error({ err }, "Failed to bulk resolve errors");
      return 0;
    }
  }

  async getCommonPatterns(c: any, model?: string, minOccurrences = 2) {
    try {
      const conditions = model
        ? and(
            eq(errorLogs.resolved, false),
            eq(errorLogs.model, model),
            sql`${errorLogs.occurrenceCount} >= ${minOccurrences}`
          )
        : and(
            eq(errorLogs.resolved, false),
            sql`${errorLogs.occurrenceCount} >= ${minOccurrences}`
          );

      const errors = await getDb(c).query.errorLogs.findMany({
        where: conditions,
        orderBy: [desc(errorLogs.occurrenceCount)],
        limit: 20,
      });

      return errors.map((e: any) => ({
        pattern: e.errorMessage,
        count: e.occurrenceCount,
        fix: e.fixPattern,
      }));
    } catch (err) {
      logger.error({ err }, "Failed to get common patterns");
      return [];
    }
  }

  async getStats(c: any) {
    try {
      const db = getDb(c);
      const totalResult = await db.select({ count: sql<number>`count(*)` }).from(errorLogs);
      const unresolvedResult = await db.select({ count: sql<number>`count(*)` }).from(errorLogs).where(eq(errorLogs.resolved, false));
      const resolvedResult = await db.select({ count: sql<number>`count(*)` }).from(errorLogs).where(eq(errorLogs.resolved, true));
      const commonError = await db
        .select({ errorMessage: errorLogs.errorMessage, count: sql<number>`count(*)` })
        .from(errorLogs)
        .groupBy(errorLogs.errorMessage)
        .orderBy(desc(sql<number>`count(*)`))
        .limit(1);
      const problematicModel = await db
        .select({ model: errorLogs.model, count: sql<number>`count(*)` })
        .from(errorLogs)
        .where(eq(errorLogs.resolved, false))
        .groupBy(errorLogs.model)
        .orderBy(desc(sql<number>`count(*)`))
        .limit(1);

      return {
        totalErrors: totalResult[0]?.count || 0,
        unresolvedErrors: unresolvedResult[0]?.count || 0,
        resolvedErrors: resolvedResult[0]?.count || 0,
        mostCommonError: commonError[0]?.errorMessage || null,
        mostProblematicModel: problematicModel[0]?.model || null,
      };
    } catch (err) {
      logger.error({ err }, "Failed to get error stats");
      return {
        totalErrors: 0,
        unresolvedErrors: 0,
        resolvedErrors: 0,
        mostCommonError: null,
        mostProblematicModel: null,
      };
    }
  }

  async clearResolvedErrors(c: any, before?: Date) {
    try {
      const db = getDb(c);
      let result: any;
      if (before) {
        result = await db.delete(errorLogs).where(
          and(eq(errorLogs.resolved, true), sql`${errorLogs.lastSeenAt} < ${before}`)
        );
      } else {
        result = await db.delete(errorLogs).where(eq(errorLogs.resolved, true));
      }
      return result.changes || 0;
    } catch (err) {
      logger.error({ err }, "Failed to clear resolved errors");
      return 0;
    }
  }
}

const errorLearningService = new ErrorLearningService();

const resolveErrorSchema = z.object({
  resolution_notes: z.string().min(1),
  fix_pattern: z.string().min(1),
});

const bulkResolveSchema = z.object({
  error_type: z.string().min(1),
  model: z.string().min(1),
  resolution_notes: z.string().min(1),
  fix_pattern: z.string().min(1),
});

errorRoutes.get("/errors/patterns", async (c) => {
  try {
    const model = c.req.query("model");
    const limit = Math.min(parseInt(c.req.query("limit") || "") || 50, 100);
    const patterns = await errorLearningService.getErrorPatterns(c, model, limit);
    return c.json({ patterns, count: patterns.length });
  } catch (err) {
    logger.error({ err }, "Failed to get error patterns");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get error patterns" } }, 500);
  }
});

errorRoutes.get("/errors/common", async (c) => {
  try {
    const model = c.req.query("model");
    const minOccurrences = parseInt(c.req.query("min_occurrences") || "") || 2;
    const patterns = await errorLearningService.getCommonPatterns(c, model, minOccurrences);
    return c.json({ patterns, count: patterns.length });
  } catch (err) {
    logger.error({ err }, "Failed to get common error patterns");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get common patterns" } }, 500);
  }
});

errorRoutes.get("/errors/stats", async (c) => {
  try {
    const stats = await errorLearningService.getStats(c);
    return c.json(stats);
  } catch (err) {
    logger.error({ err }, "Failed to get error stats");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get error statistics" } }, 500);
  }
});

errorRoutes.get("/errors/similar", async (c) => {
  try {
    const operation = c.req.query("operation");
    const model = c.req.query("model");

    if (!operation || !model) {
      return c.json({
        error: {
          code: "VALIDATION_ERROR",
          message: "operation and model query parameters are required",
        },
      }, 400);
    }

    const limit = Math.min(parseInt(c.req.query("limit") || "") || 10, 50);
    const errors = await errorLearningService.findSimilarErrors(c, operation, model, limit);

    return c.json({ errors, count: errors.length });
  } catch (err) {
    logger.error({ err }, "Failed to get similar errors");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get similar errors" } }, 500);
  }
});

errorRoutes.post("/errors/:id/resolve", async (c) => {
  const errorId = parseInt(c.req.param("id") ?? "", 10);
  if (isNaN(errorId)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid error ID" } }, 400);
  }

  const validation = resolveErrorSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!validation.success) {
    return c.json({
      error: {
        code: "VALIDATION_ERROR",
        message: "resolution_notes and fix_pattern are required",
        details: validation.error.errors,
      },
    }, 400);
  }

  try {
    const { resolution_notes, fix_pattern } = validation.data;
    const success = await errorLearningService.resolveError(c, errorId, resolution_notes, fix_pattern);

    if (success) {
      return c.json({ message: "Error resolved successfully", errorId });
    }
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to resolve error" } }, 500);
  } catch (err) {
    logger.error({ err }, "Failed to resolve error");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to resolve error" } }, 500);
  }
});

errorRoutes.post("/errors/resolve", async (c) => {
  const validation = bulkResolveSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!validation.success) {
    return c.json({
      error: {
        code: "VALIDATION_ERROR",
        message: "error_type, model, resolution_notes, and fix_pattern are required",
        details: validation.error.errors,
      },
    }, 400);
  }

  try {
    const { error_type, model, resolution_notes, fix_pattern } = validation.data;
    const count = await errorLearningService.bulkResolveByType(c, error_type, model, resolution_notes, fix_pattern);
    return c.json({ message: `${count} errors resolved successfully`, count });
  } catch (err) {
    logger.error({ err }, "Failed to bulk resolve errors");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to bulk resolve errors" } }, 500);
  }
});

errorRoutes.delete("/errors/resolved", async (c) => {
  try {
    const before = c.req.query("before") ? new Date(c.req.query("before") as string) : undefined;
    const count = await errorLearningService.clearResolvedErrors(c, before);
    return c.json({ message: `${count} resolved errors cleared`, count });
  } catch (err) {
    logger.error({ err }, "Failed to clear resolved errors");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to clear resolved errors" } }, 500);
  }
});
