import { Router } from "express";
import { validateBody, validateParams } from "../middleware/validate.js";
import { createDeckSchema, updateDeckSchema, mergeDecksSchema, idParamSchema, } from "./validators.js";
import { db, decks, cards, mindMaps, freeTierUsage, qbanks } from "../db/index.js";
import { eq, inArray, asc, isNull, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { getConfig } from "../config.js";
const router = Router();
// Get user ID from request (authenticated or anonymous)
function getUserId(req) {
    return req.isAuthenticated() ? req.user.id : null;
}
// Deck owner filter
function deckOwnerFilter(userId) {
    return userId ? eq(decks.userId, userId) : isNull(decks.userId);
}
// Check if user owns resource
function ownsResource(resourceUserId, requestUserId) {
    return resourceUserId === requestUserId;
}
// Check free tier deck limit
async function checkDeckQuota(identifier) {
    const config = getConfig();
    const usage = await db.query.freeTierUsage.findFirst({
        where: eq(freeTierUsage.identifier, identifier),
    });
    const count = usage?.deckCount || 0;
    return { allowed: count < config.FREE_MAX_DECKS, count };
}
// Record deck creation for free tier
async function recordDeckCreation(identifier) {
    const existing = await db.query.freeTierUsage.findFirst({
        where: eq(freeTierUsage.identifier, identifier),
    });
    if (existing) {
        await db.update(freeTierUsage)
            .set({ deckCount: existing.deckCount + 1 })
            .where(eq(freeTierUsage.id, existing.id));
    }
    else {
        await db.insert(freeTierUsage).values({
            identifier,
            deckCount: 1,
            lastResetAt: new Date(),
        });
    }
}
// List all decks
router.get("/decks", async (req, res) => {
    try {
        const userId = getUserId(req);
        // Get decks with card count using raw query for reliability
        const deckList = await db.select({
            id: decks.id,
            name: decks.name,
            description: decks.description,
            parentId: decks.parentId,
            kind: decks.kind,
            createdAt: decks.createdAt,
            updatedAt: decks.updatedAt,
            cardCount: sql `count(${cards.id})`,
        })
            .from(decks)
            .leftJoin(cards, eq(cards.deckId, decks.id))
            .where(deckOwnerFilter(userId))
            .groupBy(decks.id)
            .orderBy(asc(decks.createdAt));
        res.json(deckList);
    }
    catch (err) {
        logger.error({ err }, "Failed to list decks");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list decks" } });
    }
});
// Create new deck
router.post("/decks", validateBody(createDeckSchema), async (req, res) => {
    const { name, description, parentId, kind } = req.body;
    try {
        const userId = getUserId(req);
        const identifier = userId || req.ip || "unknown";
        if (!parentId) {
            const { allowed } = await checkDeckQuota(identifier);
            if (!allowed && !userId) {
                res.status(403).json({
                    error: {
                        code: "FORBIDDEN",
                        message: `Free users can create up to ${getConfig().FREE_MAX_DECKS} decks. Sign in for more.`,
                    },
                });
                return;
            }
        }
        const [deck] = await db.insert(decks).values({
            name,
            description: description || null,
            parentId: parentId || null,
            kind: kind === "qbank" ? "qbank" : "deck",
            userId,
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();
        if (!parentId) {
            await recordDeckCreation(identifier);
        }
        res.status(201).json({ ...deck, cardCount: 0 });
    }
    catch (err) {
        logger.error({ err }, "Failed to create deck");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create deck" } });
    }
});
router.get("/decks/tree", async (req, res) => {
    try {
        const userId = getUserId(req);
        const allDecks = await db.select({
            id: decks.id,
            name: decks.name,
            description: decks.description,
            parentId: decks.parentId,
            kind: decks.kind,
            createdAt: decks.createdAt,
            cardCount: sql `count(${cards.id})`,
        })
            .from(decks)
            .leftJoin(cards, eq(cards.deckId, decks.id))
            .where(deckOwnerFilter(userId))
            .groupBy(decks.id)
            .orderBy(decks.name);
        const buildTree = (parentId) => {
            return allDecks
                .filter(d => d.parentId === parentId)
                .map(d => ({
                id: d.id,
                name: d.name,
                kind: d.kind,
                parentId: d.parentId,
                cardCount: d.cardCount,
                children: buildTree(d.id),
            }));
        };
        res.json(buildTree(null));
    }
    catch (err) {
        logger.error({ err }, "Failed to get deck tree");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get deck tree" } });
    }
});
// Get single deck with cards
router.get("/decks/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
        return;
    }
    try {
        const userId = getUserId(req);
        // Get deck with card count
        const deckResult = await db.select({
            id: decks.id,
            name: decks.name,
            description: decks.description,
            parentId: decks.parentId,
            kind: decks.kind,
            userId: decks.userId,
            createdAt: decks.createdAt,
            cardCount: sql `count(${cards.id})`,
        })
            .from(decks)
            .leftJoin(cards, eq(cards.deckId, decks.id))
            .where(eq(decks.id, id))
            .groupBy(decks.id);
        const deck = deckResult[0];
        if (!deck || !ownsResource(deck.userId, userId)) {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "Deck not found" } });
            return;
        }
        // Get sub-decks
        const subDecks = await db.select({
            id: decks.id,
            name: decks.name,
            description: decks.description,
            parentId: decks.parentId,
            kind: decks.kind,
            createdAt: decks.createdAt,
            cardCount: sql `count(${cards.id})`,
        })
            .from(decks)
            .leftJoin(cards, eq(cards.deckId, decks.id))
            .where(and(eq(decks.parentId, id), deckOwnerFilter(userId)))
            .groupBy(decks.id)
            .orderBy(asc(decks.name));
        res.json({
            id: deck.id,
            name: deck.name,
            description: deck.description,
            parentId: deck.parentId,
            kind: deck.kind,
            createdAt: deck.createdAt,
            cardCount: deck.cardCount,
            subDecks,
        });
    }
    catch (err) {
        logger.error({ err }, "Failed to get deck");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get deck" } });
    }
});
// Update deck
router.patch("/decks/:id", validateParams(idParamSchema), validateBody(updateDeckSchema), async (req, res) => {
    const id = req.params.id;
    const { name, description, parentId, kind } = req.body;
    try {
        const userId = getUserId(req);
        const deck = await db.query.decks.findFirst({
            where: eq(decks.id, id),
        });
        if (!deck || !ownsResource(deck.userId, userId)) {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "Deck not found" } });
            return;
        }
        const [updated] = await db.update(decks).set({
            name: name ?? deck.name,
            description: description !== undefined ? description : deck.description,
            parentId: parentId !== undefined ? parentId : deck.parentId,
            kind: kind ?? deck.kind,
            updatedAt: new Date(),
        }).where(and(eq(decks.id, id), deckOwnerFilter(userId))).returning();
        res.json(updated);
    }
    catch (err) {
        logger.error({ err }, "Failed to update deck");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update deck" } });
    }
});
// Delete deck
router.delete("/decks/:id", validateParams(idParamSchema), async (req, res) => {
    const id = req.params.id;
    try {
        const userId = getUserId(req);
        const deck = await db.query.decks.findFirst({
            where: eq(decks.id, id),
        });
        if (!deck || !ownsResource(deck.userId, userId)) {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "Deck not found" } });
            return;
        }
        const allDecks = await db.query.decks.findMany();
        function collectDescendants(parentId) {
            const children = allDecks.filter(d => d.parentId === parentId);
            return [...children.map(d => d.id), ...children.flatMap(c => collectDescendants(c.id))];
        }
        const idsToDelete = [id, ...collectDescendants(id)];
        await db.delete(cards).where(inArray(cards.deckId, idsToDelete));
        await db.delete(mindMaps).where(inArray(mindMaps.deckId, idsToDelete));
        await db.delete(decks).where(inArray(decks.id, idsToDelete));
        res.status(204).send();
    }
    catch (err) {
        logger.error({ err }, "Failed to delete deck");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete deck" } });
    }
});
// Get deck cards
router.get("/decks/:id/cards", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
        return;
    }
    try {
        const allDecks = await db.query.decks.findMany();
        function collectDescendantIds(parentId) {
            const children = allDecks.filter(d => d.parentId === parentId);
            return [...children.map(d => d.id), ...children.flatMap(c => collectDescendantIds(c.id))];
        }
        const allDeckIds = [id, ...collectDescendantIds(id)];
        const deckCards = await db.query.cards.findMany({
            where: inArray(cards.deckId, allDeckIds),
            orderBy: [asc(cards.createdAt)],
        });
        res.json(deckCards);
    }
    catch (err) {
        logger.error({ err }, "Failed to get deck cards");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get cards" } });
    }
});
// Export deck as CSV
router.get("/decks/:id/export", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
        return;
    }
    try {
        const deck = await db.query.decks.findFirst({
            where: eq(decks.id, id),
        });
        if (!deck) {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "Deck not found" } });
            return;
        }
        const deckCards = await db.query.cards.findMany({
            where: eq(cards.deckId, id),
            orderBy: [asc(cards.createdAt)],
        });
        const rows = deckCards.map(c => {
            const front = c.front.replace(/\t/g, " ").replace(/\n/g, "<br>");
            const back = c.back.replace(/\t/g, " ").replace(/\n/g, "<br>");
            const tags = c.tags ? c.tags.replace(/\t/g, " ") : "";
            return tags ? `${front}\t${back}\t${tags}` : `${front}\t${back}`;
        });
        res.json({ deckName: deck.name, csv: rows.join("\n"), cardCount: deckCards.length });
    }
    catch (err) {
        logger.error({ err }, "Failed to export deck");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to export deck" } });
    }
});
// Merge decks
router.post("/decks/merge", validateBody(mergeDecksSchema), async (req, res) => {
    const { deckIds, newDeckName, parentId, deleteOriginals } = req.body;
    try {
        const userId = getUserId(req);
        const allDecks = await db.query.decks.findMany();
        const byId = new Map(allDecks.map(d => [d.id, d]));
        for (const id of deckIds) {
            if (!byId.has(id)) {
                res.status(404).json({ error: { code: "NOT_FOUND", message: `Deck ${id} not found` } });
                return;
            }
        }
        const sourceCards = await db.query.cards.findMany({
            where: inArray(cards.deckId, deckIds),
            orderBy: [asc(cards.createdAt)],
        });
        if (sourceCards.length === 0) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No cards to merge" } });
            return;
        }
        // Create merged deck
        const [mergedDeck] = await db.insert(decks).values({
            name: newDeckName,
            description: `Merged from ${deckIds.length} decks`,
            parentId: parentId || null,
            kind: "deck",
            userId,
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();
        // Copy cards to new deck
        await db.insert(cards).values(sourceCards.map(c => ({
            deckId: mergedDeck.id,
            front: c.front,
            back: c.back,
            tags: c.tags,
            cardType: c.cardType,
            choices: c.choices,
            correctIndex: c.correctIndex,
            pageNumber: c.pageNumber,
            image: c.image,
            createdAt: new Date(),
            updatedAt: new Date(),
        })));
        // Delete originals if requested
        if (deleteOriginals) {
            await db.delete(decks).where(inArray(decks.id, deckIds));
        }
        res.status(201).json({
            ...mergedDeck,
            cardCount: sourceCards.length,
            mergedDeckCount: deckIds.length,
            deletedOriginals: deleteOriginals,
        });
    }
    catch (err) {
        logger.error({ err }, "Failed to merge decks");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to merge decks" } });
    }
});
// ── Move deck to folder ──
router.post("/decks/:id/move", validateParams(idParamSchema), async (req, res) => {
    const id = req.params.id;
    const { parentId } = req.body;
    try {
        const userId = getUserId(req);
        const deck = await db.query.decks.findFirst({ where: eq(decks.id, id) });
        if (!deck || !ownsResource(deck.userId, userId)) {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "Deck not found" } });
            return;
        }
        // Prevent moving a deck into itself or its own descendants
        if (parentId !== null) {
            const allDecks = await db.query.decks.findMany();
            function isDescendant(parentId, childId) {
                const children = allDecks.filter(d => d.parentId === parentId);
                return children.some(c => c.id === childId || isDescendant(c.id, childId));
            }
            if (isDescendant(id, parentId)) {
                res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Cannot move a deck into its own descendant" } });
                return;
            }
        }
        const [updated] = await db.update(decks).set({
            parentId: parentId !== undefined ? parentId : deck.parentId,
            updatedAt: new Date(),
        }).where(and(eq(decks.id, id), deckOwnerFilter(userId))).returning();
        res.json(updated);
    }
    catch (err) {
        logger.error({ err }, "Failed to move deck");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to move deck" } });
    }
});
router.get("/qbanks/tree", async (req, res) => {
    try {
        const userId = getUserId(req);
        const { questions } = await import("../db/index.js");
        const allQbanks = await db.select({
            id: qbanks.id,
            name: qbanks.name,
            parentId: qbanks.parentId,
            createdAt: qbanks.createdAt,
            questionCount: sql `count(${questions.id})`,
        })
            .from(qbanks)
            .leftJoin(questions, eq(questions.qbankId, qbanks.id))
            .where(userId ? eq(qbanks.userId, userId) : isNull(qbanks.userId))
            .groupBy(qbanks.id)
            .orderBy(qbanks.name);
        const buildTree = (parentId) => {
            return allQbanks
                .filter(q => q.parentId === parentId)
                .map(q => ({
                id: q.id,
                name: q.name,
                parentId: q.parentId,
                questionCount: q.questionCount,
                children: buildTree(q.id),
            }));
        };
        res.json(buildTree(null));
    }
    catch (err) {
        logger.error({ err }, "Failed to get qbank tree");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get qbank tree" } });
    }
});
export default router;
//# sourceMappingURL=decks.js.map