import { Router } from "express";
import { db, cards, decks } from "../db/index.js";
import { eq, inArray } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import { createCardSchema, updateCardSchema, regenerateBatchSchema, idParamSchema, deckIdQuerySchema, } from "./validators.js";
const router = Router();
// Get cards by deck ID
router.get("/cards", validateQuery(deckIdQuerySchema), async (req, res) => {
    const { deckId } = req.query;
    try {
        const deckCards = await db.query.cards.findMany({
            where: eq(cards.deckId, deckId),
        });
        res.json(deckCards);
    }
    catch (err) {
        logger.error({ err }, "Failed to get cards");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get cards" } });
    }
});
// Create new card
router.post("/cards", validateBody(createCardSchema), async (req, res) => {
    const { deckId, front, back, cardType, tags } = req.body;
    try {
        const deck = await db.query.decks.findFirst({
            where: eq(decks.id, deckId),
        });
        if (!deck) {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "Deck not found" } });
            return;
        }
        const [card] = await db.insert(cards).values({
            deckId, front, back,
            tags: tags || null,
            cardType: cardType || "basic",
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();
        res.status(201).json(card);
    }
    catch (err) {
        logger.error({ err }, "Failed to create card");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create card" } });
    }
});
// Update card
router.patch("/cards/:id", validateParams(idParamSchema), validateBody(updateCardSchema), async (req, res) => {
    const id = req.params.id;
    const { front, back, tags, cardType, choices, correctIndex } = req.body;
    try {
        const [card] = await db.update(cards).set({
            front: front,
            back: back,
            tags: tags !== undefined ? tags : undefined,
            cardType: cardType,
            choices: choices ? JSON.stringify(choices) : undefined,
            correctIndex: correctIndex,
            updatedAt: new Date(),
        }).where(eq(cards.id, id)).returning();
        if (!card) {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "Card not found" } });
            return;
        }
        res.json(card);
    }
    catch (err) {
        logger.error({ err }, "Failed to update card");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update card" } });
    }
});
// Delete card
router.delete("/cards/:id", validateParams(idParamSchema), async (req, res) => {
    const id = req.params.id;
    try {
        const [deleted] = await db.delete(cards).where(eq(cards.id, id)).returning();
        if (!deleted) {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "Card not found" } });
            return;
        }
        res.status(204).send();
    }
    catch (err) {
        logger.error({ err }, "Failed to delete card");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete card" } });
    }
});
// Batch regenerate cards with AI
router.post("/cards/regenerate-batch", validateBody(regenerateBatchSchema), async (req, res) => {
    const { cardIds } = req.body;
    const MAX_BATCH = 10;
    const ids = cardIds.slice(0, MAX_BATCH);
    try {
        const cardsToRegenerate = await db.query.cards.findMany({
            where: inArray(cards.id, ids),
        });
        if (cardsToRegenerate.length === 0) {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "No cards found" } });
            return;
        }
        // In a real implementation, this would call an AI service
        // For now, we'll return the original cards
        logger.info({ count: cardsToRegenerate.length }, "Batch regenerate requested");
        res.json({
            regeneratedCount: 0,
            cards: cardsToRegenerate,
            message: "AI regeneration not configured. Add AI provider keys to enable.",
        });
    }
    catch (err) {
        logger.error({ err }, "Failed to regenerate cards");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to regenerate cards" } });
    }
});
export default router;
//# sourceMappingURL=cards.js.map