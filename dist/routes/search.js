import { Router } from "express";
import { db, decks, cards } from "../db/index.js";
import { eq, and, sql, isNull } from "drizzle-orm";
const router = Router();
function getUserId(req) {
    return req.isAuthenticated() ? req.user.id : null;
}
router.get("/search", async (req, res) => {
    try {
        const userId = getUserId(req);
        const query = (req.query.q || "").trim().toLowerCase();
        if (!query) {
            res.json({ decks: [], cards: [] });
            return;
        }
        const userFilter = userId ? eq(decks.userId, userId) : isNull(decks.userId);
        const deckResults = await db.query.decks.findMany({
            where: and(userFilter, sql `LOWER(${decks.name}) LIKE ${`%${query}%`}`),
            limit: 10,
        });
        const deckIds = deckResults.map((d) => d.id);
        const cardResults = deckIds.length > 0
            ? await db.query.cards.findMany({
                where: and(sql `LOWER(${cards.front}) LIKE ${`%${query}%`}`),
                limit: 20,
            })
            : [];
        const deckIdsSet = new Set(deckIds);
        const filteredCards = cardResults.filter((c) => deckIdsSet.has(c.deckId));
        const deckMap = new Map(deckResults.map((d) => [d.id, d.name]));
        res.json({
            decks: deckResults.map((d) => ({
                id: d.id,
                name: d.name,
                cardCount: 0,
            })),
            cards: filteredCards.map((c) => ({
                id: c.id,
                front: c.front.length > 80 ? c.front.slice(0, 80) + "..." : c.front,
                deckId: c.deckId,
                deckName: deckMap.get(c.deckId) || "Unknown",
            })),
        });
    }
    catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ error: { message: "Search failed", code: "SEARCH_ERROR" } });
    }
});
export default router;
//# sourceMappingURL=search.js.map