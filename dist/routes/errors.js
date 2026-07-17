import { Router } from "express";
import { errorLearningService } from "../lib/error-learning.js";
import { logger } from "../lib/logger.js";
import { z } from "zod";
const router = Router();
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
// Get all unresolved error patterns
router.get("/patterns", async (req, res) => {
    try {
        const model = req.query.model;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const patterns = await errorLearningService.getErrorPatterns(model, limit);
        res.json({
            patterns,
            count: patterns.length,
        });
    }
    catch (err) {
        logger.error({ err }, "Failed to get error patterns");
        res.status(500).json({
            error: { code: "INTERNAL_ERROR", message: "Failed to get error patterns" },
        });
    }
});
// Get common error patterns with fixes
router.get("/common", async (req, res) => {
    try {
        const model = req.query.model;
        const minOccurrences = parseInt(req.query.min_occurrences) || 2;
        const patterns = await errorLearningService.getCommonPatterns(model, minOccurrences);
        res.json({
            patterns,
            count: patterns.length,
        });
    }
    catch (err) {
        logger.error({ err }, "Failed to get common error patterns");
        res.status(500).json({
            error: { code: "INTERNAL_ERROR", message: "Failed to get common patterns" },
        });
    }
});
// Get error statistics
router.get("/stats", async (_req, res) => {
    try {
        const stats = await errorLearningService.getStats();
        res.json(stats);
    }
    catch (err) {
        logger.error({ err }, "Failed to get error stats");
        res.status(500).json({
            error: { code: "INTERNAL_ERROR", message: "Failed to get error statistics" },
        });
    }
});
// Get similar errors for an operation
router.get("/similar", async (req, res) => {
    try {
        const { operation, model } = req.query;
        if (!operation || !model) {
            res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "operation and model query parameters are required",
                },
            });
            return;
        }
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const errors = await errorLearningService.findSimilarErrors(operation, model, limit);
        res.json({
            errors,
            count: errors.length,
        });
    }
    catch (err) {
        logger.error({ err }, "Failed to get similar errors");
        res.status(500).json({
            error: { code: "INTERNAL_ERROR", message: "Failed to get similar errors" },
        });
    }
});
// Resolve a specific error
router.post("/:id/resolve", async (req, res) => {
    const errorId = parseInt(req.params.id, 10);
    if (isNaN(errorId)) {
        res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Invalid error ID" },
        });
        return;
    }
    const validation = resolveErrorSchema.safeParse(req.body);
    if (!validation.success) {
        res.status(400).json({
            error: {
                code: "VALIDATION_ERROR",
                message: "resolution_notes and fix_pattern are required",
                details: validation.error.errors,
            },
        });
        return;
    }
    try {
        const { resolution_notes, fix_pattern } = validation.data;
        const success = await errorLearningService.resolveError(errorId, resolution_notes, fix_pattern);
        if (success) {
            res.json({
                message: "Error resolved successfully",
                errorId,
            });
        }
        else {
            res.status(500).json({
                error: { code: "INTERNAL_ERROR", message: "Failed to resolve error" },
            });
        }
    }
    catch (err) {
        logger.error({ err }, "Failed to resolve error");
        res.status(500).json({
            error: { code: "INTERNAL_ERROR", message: "Failed to resolve error" },
        });
    }
});
// Bulk resolve errors by type and model
router.post("/resolve", async (req, res) => {
    const validation = bulkResolveSchema.safeParse(req.body);
    if (!validation.success) {
        res.status(400).json({
            error: {
                code: "VALIDATION_ERROR",
                message: "error_type, model, resolution_notes, and fix_pattern are required",
                details: validation.error.errors,
            },
        });
        return;
    }
    try {
        const { error_type, model, resolution_notes, fix_pattern } = validation.data;
        const count = await errorLearningService.bulkResolveByType(error_type, model, resolution_notes, fix_pattern);
        res.json({
            message: `${count} errors resolved successfully`,
            count,
        });
    }
    catch (err) {
        logger.error({ err }, "Failed to bulk resolve errors");
        res.status(500).json({
            error: { code: "INTERNAL_ERROR", message: "Failed to bulk resolve errors" },
        });
    }
});
// Clear resolved errors
router.delete("/resolved", async (req, res) => {
    try {
        const before = req.query.before
            ? new Date(req.query.before)
            : undefined;
        const count = await errorLearningService.clearResolvedErrors(before);
        res.json({
            message: `${count} resolved errors cleared`,
            count,
        });
    }
    catch (err) {
        logger.error({ err }, "Failed to clear resolved errors");
        res.status(500).json({
            error: { code: "INTERNAL_ERROR", message: "Failed to clear resolved errors" },
        });
    }
});
export default router;
//# sourceMappingURL=errors.js.map