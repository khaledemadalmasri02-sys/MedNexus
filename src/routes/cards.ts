import { Hono } from "hono";
import { eq, inArray } from "drizzle-orm";
import type { AppEnv } from "../types";
import type { DB } from "../db/index";
import { cards, decks } from "../db/index";
import { validate, createCardSchema, updateCardSchema, regenerateBatchSchema } from "../middleware/validate";

export const cardRoutes = new Hono<AppEnv>();

function getDb(c: any): DB { return c.get("db"); }

cardRoutes.get("/cards", async (c) => {
  const deckId = parseInt(c.req.query("deckId") || "", 10);
  if (isNaN(deckId)) return c.json({ error: { code: "VALIDATION_ERROR", message: "deckId required" } }, 400);
  try {
    const deckCards = await getDb(c).query.cards.findMany({ where: eq(cards.deckId, deckId) });
    return c.json(deckCards);
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get cards" } }, 500);
  }
});

cardRoutes.post("/cards", validate(createCardSchema), async (c) => {
  const { deckId, front, back, cardType, tags } = c.get("validated") as any;
  try {
    const deck = await getDb(c).query.decks.findFirst({ where: eq(decks.id, deckId) });
    if (!deck) return c.json({ error: { code: "NOT_FOUND", message: "Deck not found" } }, 404);
    const [card] = await getDb(c).insert(cards).values({
      deckId, front, back, tags: tags || null, cardType: cardType || "basic",
      createdAt: new Date(), updatedAt: new Date(),
    }).returning();
    return c.json(card, 201);
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to create card" } }, 500);
  }
});

cardRoutes.patch("/cards/:id", validate(updateCardSchema), async (c) => {
  const id = parseInt(c.req.param("id") ?? "", 10);
  const { front, back, tags, cardType, choices, correctIndex } = c.get("validated") as any;
  try {
    const [card] = await getDb(c).update(cards).set({
      front, back,
      tags: tags !== undefined ? tags : undefined,
      cardType,
      choices: choices ? JSON.stringify(choices) : undefined,
      correctIndex,
      updatedAt: new Date(),
    }).where(eq(cards.id, id)).returning();
    if (!card) return c.json({ error: { code: "NOT_FOUND", message: "Card not found" } }, 404);
    return c.json(card);
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to update card" } }, 500);
  }
});

cardRoutes.delete("/cards/:id", async (c) => {
  const id = parseInt(c.req.param("id") ?? "", 10);
  try {
    const [deleted] = await getDb(c).delete(cards).where(eq(cards.id, id)).returning();
    if (!deleted) return c.json({ error: { code: "NOT_FOUND", message: "Card not found" } }, 404);
    return new Response(null, { status: 204 });
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete card" } }, 500);
  }
});

cardRoutes.post("/cards/regenerate-batch", validate(regenerateBatchSchema), async (c) => {
  const { cardIds } = c.get("validated") as any;
  const MAX_BATCH = 10;
  const ids = cardIds.slice(0, MAX_BATCH);
  try {
    const cardsToRegenerate = await getDb(c).query.cards.findMany({ where: inArray(cards.id, ids) });
    if (cardsToRegenerate.length === 0) {
      return c.json({ error: { code: "NOT_FOUND", message: "No cards found" } }, 404);
    }
    return c.json({
      regeneratedCount: 0,
      cards: cardsToRegenerate,
      message: "AI regeneration not configured. Add AI provider keys to enable.",
    });
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to regenerate cards" } }, 500);
  }
});
