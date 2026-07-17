import { Router } from "express";
import { db, tags, deckTags, qbankTags, decks } from "../db/index.js";
import { eq, and, isNull, inArray, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { deckTagsSchema } from "./validators.js";
const router = Router();
function getUserId(req) {
    return req.isAuthenticated() ? req.user.id : null;
}
const createTagSchema = z.object({
    name: z.string().min(1).max(50),
    color: z.string().max(20).optional(),
});
const updateTagSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    color: z.string().max(20).optional(),
});
// ── GET /api/tags — list all tags with usage count ──
router.get("/tags", async (req, res) => {
    try {
        const userId = getUserId(req);
        const userTags = await db.query.tags.findMany({
            where: userId ? eq(tags.userId, userId) : isNull(tags.userId),
        });
        if (userTags.length === 0) {
            res.json([]);
            return;
        }
        const tagIds = userTags.map(t => t.id);
        const [deckCounts, qbankCounts] = await Promise.all([
            db.select({ tagId: deckTags.tagId, count: sql `count(*)` })
                .from(deckTags)
                .where(inArray(deckTags.tagId, tagIds))
                .groupBy(deckTags.tagId),
            db.select({ tagId: qbankTags.tagId, count: sql `count(*)` })
                .from(qbankTags)
                .where(inArray(qbankTags.tagId, tagIds))
                .groupBy(qbankTags.tagId),
        ]);
        const deckCountMap = new Map(deckCounts.map(c => [c.tagId, c.count]));
        const qbankCountMap = new Map(qbankCounts.map(c => [c.tagId, c.count]));
        const tagsWithCount = userTags.map(tag => {
            const deckCount = deckCountMap.get(tag.id) || 0;
            const qbankCount = qbankCountMap.get(tag.id) || 0;
            return {
                ...tag,
                deckCount,
                qbankCount,
                totalCount: deckCount + qbankCount,
            };
        });
        res.json(tagsWithCount);
    }
    catch (err) {
        logger.error({ err }, "Failed to list tags");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list tags" } });
    }
});
// ── POST /api/tags — create tag ──
router.post("/tags", validateBody(createTagSchema), async (req, res) => {
    const { name, color } = req.body;
    try {
        const userId = getUserId(req);
        const [tag] = await db.insert(tags).values({ name, color: color || "#06B6D4", userId }).returning();
        res.status(201).json({ ...tag, deckCount: 0, qbankCount: 0, totalCount: 0 });
    }
    catch (err) {
        logger.error({ err }, "Failed to create tag");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create tag" } });
    }
});
// ── PATCH /api/tags/:id — update tag ──
router.patch("/tags/:id", validateBody(updateTagSchema), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
        return;
    }
    const userId = getUserId(req);
    try {
        const existing = await db.query.tags.findFirst({ where: eq(tags.id, id) });
        if (!existing || (userId && existing.userId !== userId) || (!userId && existing.userId !== null)) {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "Tag not found" } });
            return;
        }
        const [updated] = await db.update(tags).set({
            name: req.body.name ?? existing.name,
            color: req.body.color ?? existing.color,
        }).where(eq(tags.id, id)).returning();
        res.json(updated);
    }
    catch (err) {
        logger.error({ err }, "Failed to update tag");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update tag" } });
    }
});
// ── DELETE /api/tags/:id ──
router.delete("/tags/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
        return;
    }
    try {
        await db.delete(deckTags).where(eq(deckTags.tagId, id));
        await db.delete(qbankTags).where(eq(qbankTags.tagId, id));
        await db.delete(tags).where(eq(tags.id, id));
        res.status(204).send();
    }
    catch (err) {
        logger.error({ err }, "Failed to delete tag");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete tag" } });
    }
});
// ── POST /api/decks/:id/tags — add tags to deck ──
router.post("/decks/:id/tags", validateBody(deckTagsSchema), async (req, res) => {
    const deckId = parseInt(req.params.id, 10);
    if (isNaN(deckId)) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } });
        return;
    }
    const { tagIds } = req.body;
    if (!Array.isArray(tagIds) || tagIds.length === 0) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "tagIds array required" } });
        return;
    }
    try {
        const userId = getUserId(req);
        const deck = await db.query.decks.findFirst({ where: eq(decks.id, deckId) });
        if (!deck || (userId && deck.userId !== userId) || (!userId && deck.userId !== null)) {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "Deck not found" } });
            return;
        }
        await db.insert(deckTags).values(tagIds.map(tagId => ({ deckId, tagId })));
        res.status(201).json({ success: true });
    }
    catch (err) {
        logger.error({ err }, "Failed to add tags to deck");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to add tags" } });
    }
});
// ── DELETE /api/decks/:id/tags/:tagId — remove tag from deck ──
router.delete("/decks/:id/tags/:tagId", async (req, res) => {
    const deckId = parseInt(req.params.id, 10);
    const tagId = parseInt(req.params.tagId, 10);
    if (isNaN(deckId) || isNaN(tagId)) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
        return;
    }
    try {
        await db.delete(deckTags).where(and(eq(deckTags.deckId, deckId), eq(deckTags.tagId, tagId)));
        res.status(204).send();
    }
    catch (err) {
        logger.error({ err }, "Failed to remove tag from deck");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to remove tag" } });
    }
});
export default router;
//# sourceMappingURL=tags.js.map