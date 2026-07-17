import { db, errorLogs } from "../db/index.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { logger } from "./logger.js";
function hashInput(input) {
    let hash = 0;
    const str = input.slice(0, 2000);
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}
export class ErrorLearningService {
    async logError(input) {
        try {
            const inputHash = hashInput(input.inputData);
            const inputPreview = input.inputData.slice(0, 500);
            const now = new Date();
            const existing = await db.query.errorLogs.findFirst({
                where: and(eq(errorLogs.inputHash, inputHash), eq(errorLogs.errorType, input.errorType), eq(errorLogs.resolved, false)),
            });
            if (existing) {
                const [updated] = await db
                    .update(errorLogs)
                    .set({
                    occurrenceCount: (existing.occurrenceCount || 1) + 1,
                    lastSeenAt: now,
                    errorMessage: input.error.message,
                    errorStack: input.error.stack || null,
                })
                    .where(eq(errorLogs.id, existing.id))
                    .returning();
                logger.info({
                    errorId: updated.id,
                    type: input.errorType,
                    occurrences: updated.occurrenceCount,
                }, "Error occurrence incremented");
                return updated;
            }
            const [created] = await db
                .insert(errorLogs)
                .values({
                errorType: input.errorType,
                errorCode: input.errorCode,
                model: input.model,
                operation: input.operation,
                inputHash,
                inputPreview,
                errorMessage: input.error.message,
                errorStack: input.error.stack,
                context: input.context ? JSON.stringify(input.context) : null,
                resolved: false,
                resolutionNotes: null,
                fixPattern: null,
                occurrenceCount: 1,
                firstSeenAt: now,
                lastSeenAt: now,
                createdAt: now,
            })
                .returning();
            logger.info({
                errorId: created.id,
                type: input.errorType,
                model: input.model,
                operation: input.operation,
            }, "New error logged");
            return created;
        }
        catch (err) {
            logger.error({ err }, "Failed to log error to database");
            return null;
        }
    }
    async findSimilarErrors(operation, model, limit = 10) {
        try {
            const errors = await db.query.errorLogs.findMany({
                where: and(eq(errorLogs.operation, operation), eq(errorLogs.model, model), eq(errorLogs.resolved, false)),
                orderBy: [desc(errorLogs.lastSeenAt)],
                limit,
            });
            return errors;
        }
        catch (err) {
            logger.error({ err }, "Failed to query similar errors");
            return [];
        }
    }
    async getErrorPatterns(model, limit = 50) {
        try {
            const conditions = model
                ? and(eq(errorLogs.resolved, false), eq(errorLogs.model, model))
                : eq(errorLogs.resolved, false);
            const errors = await db.query.errorLogs.findMany({
                where: conditions,
                orderBy: [desc(errorLogs.occurrenceCount), desc(errorLogs.lastSeenAt)],
                limit,
            });
            return errors;
        }
        catch (err) {
            logger.error({ err }, "Failed to get error patterns");
            return [];
        }
    }
    async resolveError(errorId, resolutionNotes, fixPattern) {
        try {
            await db
                .update(errorLogs)
                .set({
                resolved: true,
                resolutionNotes,
                fixPattern,
            })
                .where(eq(errorLogs.id, errorId));
            logger.info({ errorId, resolutionNotes }, "Error resolved");
            return true;
        }
        catch (err) {
            logger.error({ err }, "Failed to resolve error");
            return false;
        }
    }
    async bulkResolveByType(errorType, model, resolutionNotes, fixPattern) {
        try {
            const result = await db
                .update(errorLogs)
                .set({
                resolved: true,
                resolutionNotes,
                fixPattern,
            })
                .where(and(eq(errorLogs.errorType, errorType), eq(errorLogs.model, model), eq(errorLogs.resolved, false)));
            logger.info({ errorType, model, count: result.changes }, "Bulk errors resolved");
            return result.changes || 0;
        }
        catch (err) {
            logger.error({ err }, "Failed to bulk resolve errors");
            return 0;
        }
    }
    async getCommonPatterns(model, minOccurrences = 2) {
        try {
            const conditions = model
                ? and(eq(errorLogs.resolved, false), eq(errorLogs.model, model), sql `${errorLogs.occurrenceCount} >= ${minOccurrences}`)
                : and(eq(errorLogs.resolved, false), sql `${errorLogs.occurrenceCount} >= ${minOccurrences}`);
            const errors = await db.query.errorLogs.findMany({
                where: conditions,
                orderBy: [desc(errorLogs.occurrenceCount)],
                limit: 20,
            });
            return errors.map((e) => ({
                pattern: e.errorMessage,
                count: e.occurrenceCount,
                fix: e.fixPattern,
            }));
        }
        catch (err) {
            logger.error({ err }, "Failed to get common patterns");
            return [];
        }
    }
    buildErrorContext(operation, model) {
        return {
            hasErrors: false,
            recentErrors: [],
            commonPatterns: [],
            instructions: "",
        };
    }
    async buildErrorContextAsync(operation, model) {
        const [recentErrors, commonPatterns] = await Promise.all([
            this.findSimilarErrors(operation, model, 5),
            this.getCommonPatternsWithFix(operation, model),
        ]);
        const hasErrors = recentErrors.length > 0 || commonPatterns.length > 0;
        if (!hasErrors) {
            return {
                hasErrors: false,
                recentErrors: [],
                commonPatterns: [],
                instructions: "",
            };
        }
        const instructions = this.generateInstructions(recentErrors, commonPatterns);
        return {
            hasErrors: true,
            recentErrors,
            commonPatterns,
            instructions,
        };
    }
    async getCommonPatternsWithFix(operation, model) {
        try {
            const resolved = await db.query.errorLogs.findMany({
                where: and(eq(errorLogs.operation, operation), eq(errorLogs.model, model), eq(errorLogs.resolved, true), sql `${errorLogs.fixPattern} IS NOT NULL`),
                orderBy: [desc(errorLogs.lastSeenAt)],
                limit: 10,
            });
            return resolved.map((e) => ({
                pattern: e.errorMessage,
                count: e.occurrenceCount,
                fix: e.fixPattern,
            }));
        }
        catch {
            return [];
        }
    }
    generateInstructions(errors, patterns) {
        const lines = [];
        lines.push("## ERROR PREVENTION CONTEXT");
        lines.push("");
        lines.push("Based on previous errors in this operation, follow these guidelines:");
        lines.push("");
        const resolvedPatterns = patterns.filter((p) => p.fix);
        if (resolvedPatterns.length > 0) {
            lines.push("### Known Fixes:");
            resolvedPatterns.forEach((p, i) => {
                lines.push(`${i + 1}. Error: ${p.pattern.slice(0, 100)}`);
                lines.push(`   Fix: ${p.fix}`);
            });
            lines.push("");
        }
        const frequentErrors = errors.filter((e) => e.occurrenceCount >= 2);
        if (frequentErrors.length > 0) {
            lines.push("### Frequent Errors to Avoid:");
            frequentErrors.forEach((e, i) => {
                lines.push(`${i + 1}. [Occurred ${e.occurrenceCount}x] ${e.errorMessage.slice(0, 150)}`);
                if (e.fixPattern) {
                    lines.push(`   Resolution: ${e.fixPattern}`);
                }
            });
            lines.push("");
        }
        lines.push("IMPORTANT: Review the above errors and ensure your output avoids these issues.");
        return lines.join("\n");
    }
    async getStats() {
        try {
            const totalResult = await db
                .select({ count: sql `count(*)` })
                .from(errorLogs);
            const unresolvedResult = await db
                .select({ count: sql `count(*)` })
                .from(errorLogs)
                .where(eq(errorLogs.resolved, false));
            const resolvedResult = await db
                .select({ count: sql `count(*)` })
                .from(errorLogs)
                .where(eq(errorLogs.resolved, true));
            const commonError = await db
                .select({
                errorMessage: errorLogs.errorMessage,
                count: sql `count(*)`,
            })
                .from(errorLogs)
                .groupBy(errorLogs.errorMessage)
                .orderBy(desc(sql `count(*)`))
                .limit(1);
            const problematicModel = await db
                .select({
                model: errorLogs.model,
                count: sql `count(*)`,
            })
                .from(errorLogs)
                .where(eq(errorLogs.resolved, false))
                .groupBy(errorLogs.model)
                .orderBy(desc(sql `count(*)`))
                .limit(1);
            return {
                totalErrors: totalResult[0]?.count || 0,
                unresolvedErrors: unresolvedResult[0]?.count || 0,
                resolvedErrors: resolvedResult[0]?.count || 0,
                mostCommonError: commonError[0]?.errorMessage || null,
                mostProblematicModel: problematicModel[0]?.model || null,
            };
        }
        catch (err) {
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
    async clearResolvedErrors(before) {
        try {
            if (before) {
                const result = await db
                    .delete(errorLogs)
                    .where(and(eq(errorLogs.resolved, true), sql `${errorLogs.lastSeenAt} < ${before}`));
                return result.changes || 0;
            }
            else {
                const result = await db
                    .delete(errorLogs)
                    .where(eq(errorLogs.resolved, true));
                return result.changes || 0;
            }
        }
        catch (err) {
            logger.error({ err }, "Failed to clear resolved errors");
            return 0;
        }
    }
}
export const errorLearningService = new ErrorLearningService();
//# sourceMappingURL=error-learning.js.map