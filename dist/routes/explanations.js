import { Router } from "express";
import { logger } from "../lib/logger.js";
import { generateExplanationsForDeck, getProgress, getAllProgress, hasCardsWithoutExplanations, getExplanationStats, } from "../lib/explanation-manager.js";
const router = Router();
/**
 * POST /api/explanations/generate/:deckId
 * Start generating explanations for all cards in a deck
 */
router.post("/generate/:deckId", async (req, res) => {
    const deckId = parseInt(req.params.deckId, 10);
    if (isNaN(deckId)) {
        res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" },
        });
        return;
    }
    try {
        // Check if there are cards without explanations
        const hasCards = await hasCardsWithoutExplanations(deckId);
        if (!hasCards) {
            res.json({
                message: "All cards already have explanations",
                started: false,
            });
            return;
        }
        // Start generation in background
        generateExplanationsForDeck(deckId).catch((err) => {
            logger.error({ err, deckId }, "Background explanation generation failed");
        });
        res.json({
            message: "Explanation generation started",
            started: true,
            deckId,
        });
    }
    catch (err) {
        logger.error({ err, deckId }, "Failed to start explanation generation");
        res.status(500).json({
            error: { code: "GENERATION_ERROR", message: "Failed to start explanation generation" },
        });
    }
});
/**
 * GET /api/explanations/progress/:deckId
 * Get progress of explanation generation for a deck
 */
router.get("/progress/:deckId", async (req, res) => {
    const deckId = parseInt(req.params.deckId, 10);
    if (isNaN(deckId)) {
        res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" },
        });
        return;
    }
    try {
        const progress = getProgress(deckId);
        const stats = await getExplanationStats(deckId);
        res.json({
            progress: progress || {
                deckId,
                total: stats.total,
                completed: stats.withExplanations,
                failed: 0,
                status: stats.withoutExplanations === 0 ? "completed" : "idle",
            },
            stats,
        });
    }
    catch (err) {
        logger.error({ err, deckId }, "Failed to get explanation progress");
        res.status(500).json({
            error: { code: "SERVER_ERROR", message: "Failed to get progress" },
        });
    }
});
/**
 * GET /api/explanations/progress
 * Get all active explanation generations
 */
router.get("/progress", (_req, res) => {
    try {
        const allProgress = getAllProgress();
        res.json({ progress: allProgress });
    }
    catch (err) {
        logger.error({ err }, "Failed to get all progress");
        res.status(500).json({
            error: { code: "SERVER_ERROR", message: "Failed to get progress" },
        });
    }
});
/**
 * GET /api/explanations/stats/:deckId
 * Get explanation statistics for a deck
 */
router.get("/stats/:deckId", async (req, res) => {
    const deckId = parseInt(req.params.deckId, 10);
    if (isNaN(deckId)) {
        res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" },
        });
        return;
    }
    try {
        const stats = await getExplanationStats(deckId);
        res.json(stats);
    }
    catch (err) {
        logger.error({ err, deckId }, "Failed to get explanation stats");
        res.status(500).json({
            error: { code: "SERVER_ERROR", message: "Failed to get stats" },
        });
    }
});
export default router;
//# sourceMappingURL=explanations.js.map