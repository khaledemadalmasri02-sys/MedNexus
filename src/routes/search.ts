import { Hono } from "hono";
import { eq, and, sql, isNull } from "drizzle-orm";
import type { AppEnv } from "../types";
import { decks, cards } from "../db/index";
import { getDb, getUserId } from "../lib/helpers";

export const searchRoutes = new Hono<AppEnv>();

searchRoutes.get("/search", async (c) => {
  try {
    const userId = getUserId(c);
    const query = (c.req.query("q") || "").trim().toLowerCase();

    if (!query) {
      return c.json({ decks: [], cards: [] });
    }

    const db = getDb(c);
    const userFilter = userId ? eq(decks.userId, userId) : isNull(decks.userId);

    const deckResults = await db.query.decks.findMany({
      where: and(
        userFilter,
        sql`LOWER(${decks.name}) LIKE ${`%${query}%`}`
      ),
      limit: 10,
    });

    const deckIds = deckResults.map((d: { id: number }) => d.id);
    const cardResults = deckIds.length > 0
      ? await db.query.cards.findMany({
          where: and(
            sql`LOWER(${cards.front}) LIKE ${`%${query}%`}`
          ),
          limit: 20,
        })
      : [];

    const deckIdsSet = new Set(deckIds);
    const filteredCards = cardResults.filter((c: { deckId: number }) => deckIdsSet.has(c.deckId));
    const deckMap = new Map(deckResults.map((d: { id: number; name: string }) => [d.id, d.name]));

    return c.json({
      decks: deckResults.map((d: { id: number; name: string }) => ({
        id: d.id,
        name: d.name,
        cardCount: 0,
      })),
      cards: filteredCards.map((c: { id: number; front: string; deckId: number }) => ({
        id: c.id,
        front: c.front.length > 80 ? c.front.slice(0, 80) + "..." : c.front,
        deckId: c.deckId,
        deckName: deckMap.get(c.deckId) || "Unknown",
      })),
    });
  } catch (err) {
    console.error("Search error:", err);
    return c.json({ error: { message: "Search failed", code: "SEARCH_ERROR" } }, 500);
  }
});
