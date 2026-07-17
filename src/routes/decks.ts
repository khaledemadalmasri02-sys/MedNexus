import { Hono } from "hono";
import { eq, inArray, asc, isNull, and, sql } from "drizzle-orm";
import type { AppEnv } from "../types";
import type { DB } from "../db/index";
import { decks, cards, mindMaps, freeTierUsage, qbanks, questions } from "../db/index";
import { getConfig } from "../lib/config";
import { validate, createDeckSchema, updateDeckSchema, mergeDecksSchema } from "../middleware/validate";

export const deckRoutes = new Hono<AppEnv>();

function getDb(c: any): DB { return c.get("db"); }
function getUserId(c: any): string | null { return c.get("user")?.id ?? null; }
function deckOwnerFilter(userId: string | null) {
  return userId ? eq(decks.userId, userId) : isNull(decks.userId);
}
function ownsResource(resourceUserId: string | null, requestUserId: string | null): boolean {
  return resourceUserId === requestUserId;
}

deckRoutes.get("/decks", async (c) => {
  try {
    const userId = getUserId(c);
    const deckList = await getDb(c).select({
      id: decks.id, name: decks.name, description: decks.description, parentId: decks.parentId,
      kind: decks.kind, createdAt: decks.createdAt, updatedAt: decks.updatedAt,
      cardCount: sql<number>`count(${cards.id})`,
    })
      .from(decks)
      .leftJoin(cards, eq(cards.deckId, decks.id))
      .where(deckOwnerFilter(userId))
      .groupBy(decks.id)
      .orderBy(asc(decks.createdAt));
    return c.json(deckList);
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to list decks" } }, 500);
  }
});

deckRoutes.post("/decks", validate(createDeckSchema), async (c) => {
  const { name, description, parentId, kind } = c.get("validated") as any;
  try {
    const userId = getUserId(c);
    const identifier = userId || c.req.header("cf-connecting-ip") || "unknown";
    if (!parentId) {
      const usage = await getDb(c).query.freeTierUsage.findFirst({ where: eq(freeTierUsage.identifier, identifier) });
      const count = usage?.deckCount || 0;
      if (count >= getConfig(c.env).FREE_MAX_DECKS && !userId) {
        return c.json({ error: { code: "FORBIDDEN", message: `Free users can create up to ${getConfig(c.env).FREE_MAX_DECKS} decks. Sign in for more.` } }, 403);
      }
    }
    const [deck] = await getDb(c).insert(decks).values({
      name, description: description || null, parentId: parentId || null,
      kind: kind === "qbank" ? "qbank" : "deck", userId, createdAt: new Date(), updatedAt: new Date(),
    }).returning();
    if (!parentId) {
      const existing = await getDb(c).query.freeTierUsage.findFirst({ where: eq(freeTierUsage.identifier, identifier) });
      if (existing) {
        await getDb(c).update(freeTierUsage).set({ deckCount: existing.deckCount + 1 }).where(eq(freeTierUsage.id, existing.id));
      } else {
        await getDb(c).insert(freeTierUsage).values({ identifier, deckCount: 1, lastResetAt: new Date() });
      }
    }
    return c.json({ ...deck, cardCount: 0 }, 201);
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to create deck" } }, 500);
  }
});

deckRoutes.get("/decks/tree", async (c) => {
  try {
    const userId = getUserId(c);
    const allDecks = await getDb(c).select({
      id: decks.id, name: decks.name, description: decks.description, parentId: decks.parentId,
      kind: decks.kind, createdAt: decks.createdAt, cardCount: sql<number>`count(${cards.id})`,
    })
      .from(decks).leftJoin(cards, eq(cards.deckId, decks.id))
      .where(deckOwnerFilter(userId)).groupBy(decks.id).orderBy(decks.name);
    const buildTree = (parentId: number | null): any[] =>
      allDecks.filter((d) => d.parentId === parentId).map((d) => ({
        id: d.id, name: d.name, kind: d.kind, parentId: d.parentId, cardCount: d.cardCount, children: buildTree(d.id),
      }));
    return c.json(buildTree(null));
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get deck tree" } }, 500);
  }
});

deckRoutes.get("/decks/:id", async (c) => {
  const id = parseInt(c.req.param("id") ?? "", 10);
  if (isNaN(id)) return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
  try {
    const userId = getUserId(c);
    const deckResult = await getDb(c).select({
      id: decks.id, name: decks.name, description: decks.description, parentId: decks.parentId,
      kind: decks.kind, userId: decks.userId, createdAt: decks.createdAt,
      cardCount: sql<number>`count(${cards.id})`,
    }).from(decks).leftJoin(cards, eq(cards.deckId, decks.id)).where(eq(decks.id, id)).groupBy(decks.id);
    const deck = deckResult[0];
    if (!deck || !ownsResource(deck.userId, userId)) {
      return c.json({ error: { code: "NOT_FOUND", message: "Deck not found" } }, 404);
    }
    const subDecks = await getDb(c).select({
      id: decks.id, name: decks.name, description: decks.description, parentId: decks.parentId,
      kind: decks.kind, createdAt: decks.createdAt, cardCount: sql<number>`count(${cards.id})`,
    }).from(decks).leftJoin(cards, eq(cards.deckId, decks.id))
      .where(and(eq(decks.parentId, id), deckOwnerFilter(userId))).groupBy(decks.id).orderBy(asc(decks.name));
    return c.json({ ...deck, subDecks });
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get deck" } }, 500);
  }
});

deckRoutes.patch("/decks/:id", validate(updateDeckSchema), async (c) => {
  const id = parseInt(c.req.param("id") ?? "", 10);
  const { name, description, parentId, kind } = c.get("validated") as any;
  try {
    const userId = getUserId(c);
    const deck = await getDb(c).query.decks.findFirst({ where: eq(decks.id, id) });
    if (!deck || !ownsResource(deck.userId, userId)) {
      return c.json({ error: { code: "NOT_FOUND", message: "Deck not found" } }, 404);
    }
    const [updated] = await getDb(c).update(decks).set({
      name: name ?? deck.name,
      description: description !== undefined ? description : deck.description,
      parentId: parentId !== undefined ? parentId : deck.parentId,
      kind: kind ?? deck.kind, updatedAt: new Date(),
    }).where(and(eq(decks.id, id), deckOwnerFilter(userId))).returning();
    return c.json(updated);
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to update deck" } }, 500);
  }
});

deckRoutes.delete("/decks/:id", async (c) => {
  const id = parseInt(c.req.param("id") ?? "", 10);
  try {
    const userId = getUserId(c);
    const deck = await getDb(c).query.decks.findFirst({ where: eq(decks.id, id) });
    if (!deck || !ownsResource(deck.userId, userId)) {
      return c.json({ error: { code: "NOT_FOUND", message: "Deck not found" } }, 404);
    }
    const allDecks = await getDb(c).query.decks.findMany();
    const collectDescendants = (parentId: number): number[] => {
      const children = allDecks.filter((d) => d.parentId === parentId);
      return [...children.map((d) => d.id), ...children.flatMap((ch) => collectDescendants(ch.id))];
    };
    const idsToDelete = [id, ...collectDescendants(id)];
    await getDb(c).delete(cards).where(inArray(cards.deckId, idsToDelete));
    await getDb(c).delete(mindMaps).where(inArray(mindMaps.deckId, idsToDelete));
    await getDb(c).delete(decks).where(inArray(decks.id, idsToDelete));
    return new Response(null, { status: 204 });
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete deck" } }, 500);
  }
});

deckRoutes.get("/decks/:id/cards", async (c) => {
  const id = parseInt(c.req.param("id") ?? "", 10);
  if (isNaN(id)) return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
  try {
    const allDecks = await getDb(c).query.decks.findMany();
    const collectDescendantIds = (parentId: number): number[] => {
      const children = allDecks.filter((d) => d.parentId === parentId);
      return [...children.map((d) => d.id), ...children.flatMap((ch) => collectDescendantIds(ch.id))];
    };
    const allDeckIds = [id, ...collectDescendantIds(id)];
    const deckCards = await getDb(c).query.cards.findMany({ where: inArray(cards.deckId, allDeckIds), orderBy: [asc(cards.createdAt)] });
    return c.json(deckCards);
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get cards" } }, 500);
  }
});

deckRoutes.get("/decks/:id/export", async (c) => {
  const id = parseInt(c.req.param("id") ?? "", 10);
  if (isNaN(id)) return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
  try {
    const deck = await getDb(c).query.decks.findFirst({ where: eq(decks.id, id) });
    if (!deck) return c.json({ error: { code: "NOT_FOUND", message: "Deck not found" } }, 404);
    const deckCards = await getDb(c).query.cards.findMany({ where: eq(cards.deckId, id), orderBy: [asc(cards.createdAt)] });
    const rows = deckCards.map((card) => {
      const front = card.front.replace(/\t/g, " ").replace(/\n/g, "<br>");
      const back = card.back.replace(/\t/g, " ").replace(/\n/g, "<br>");
      const tags = card.tags ? card.tags.replace(/\t/g, " ") : "";
      return tags ? `${front}\t${back}\t${tags}` : `${front}\t${back}`;
    });
    return c.json({ deckName: deck.name, csv: rows.join("\n"), cardCount: deckCards.length });
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to export deck" } }, 500);
  }
});

deckRoutes.post("/decks/merge", validate(mergeDecksSchema), async (c) => {
  const { deckIds, newDeckName, parentId, deleteOriginals } = c.get("validated") as any;
  try {
    const userId = getUserId(c);
    const allDecks = await getDb(c).query.decks.findMany();
    const byId = new Map(allDecks.map((d) => [d.id, d]));
    for (const did of deckIds) {
      if (!byId.has(did)) return c.json({ error: { code: "NOT_FOUND", message: `Deck ${did} not found` } }, 404);
    }
    const sourceCards = await getDb(c).query.cards.findMany({ where: inArray(cards.deckId, deckIds), orderBy: [asc(cards.createdAt)] });
    if (sourceCards.length === 0) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "No cards to merge" } }, 400);
    }
    const [mergedDeck] = await getDb(c).insert(decks).values({
      name: newDeckName, description: `Merged from ${deckIds.length} decks`,
      parentId: parentId || null, kind: "deck", userId, createdAt: new Date(), updatedAt: new Date(),
    }).returning();
    await getDb(c).insert(cards).values(sourceCards.map((card) => ({
      deckId: mergedDeck.id, front: card.front, back: card.back, tags: card.tags,
      cardType: card.cardType, choices: card.choices, correctIndex: card.correctIndex,
      pageNumber: card.pageNumber, image: card.image, createdAt: new Date(), updatedAt: new Date(),
    })));
    if (deleteOriginals) await getDb(c).delete(decks).where(inArray(decks.id, deckIds));
    return c.json({ ...mergedDeck, cardCount: sourceCards.length, mergedDeckCount: deckIds.length, deletedOriginals: deleteOriginals }, 201);
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to merge decks" } }, 500);
  }
});

deckRoutes.post("/decks/:id/move", async (c) => {
  const id = parseInt(c.req.param("id") ?? "", 10);
  let body: any = {};
  try { body = await c.req.json(); } catch { /* no body */ }
  const parentId = body.parentId as number | null;
  try {
    const userId = getUserId(c);
    const deck = await getDb(c).query.decks.findFirst({ where: eq(decks.id, id) });
    if (!deck || !ownsResource(deck.userId, userId)) {
      return c.json({ error: { code: "NOT_FOUND", message: "Deck not found" } }, 404);
    }
    if (parentId !== null) {
      const allDecks = await getDb(c).query.decks.findMany();
      const isDescendant = (pid: number, cid: number): boolean => {
        const children = allDecks.filter((d) => d.parentId === pid);
        return children.some((ch) => ch.id === cid || isDescendant(ch.id, cid));
      };
      if (isDescendant(id, parentId)) {
        return c.json({ error: { code: "VALIDATION_ERROR", message: "Cannot move a deck into its own descendant" } }, 400);
      }
    }
    const [updated] = await getDb(c).update(decks).set({
      parentId: parentId !== undefined ? parentId : deck.parentId, updatedAt: new Date(),
    }).where(and(eq(decks.id, id), deckOwnerFilter(userId))).returning();
    return c.json(updated);
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to move deck" } }, 500);
  }
});

deckRoutes.get("/qbanks/tree", async (c) => {
  try {
    const userId = getUserId(c);
    const allQbanks = await getDb(c).select({
      id: qbanks.id, name: qbanks.name, parentId: qbanks.parentId, createdAt: qbanks.createdAt,
      questionCount: sql<number>`count(${questions.id})`,
    }).from(qbanks).leftJoin(questions, eq(questions.qbankId, qbanks.id))
      .where(userId ? eq(qbanks.userId, userId) : isNull(qbanks.userId))
      .groupBy(qbanks.id).orderBy(qbanks.name);
    const buildTree = (parentId: number | null): any[] =>
      allQbanks.filter((q) => q.parentId === parentId).map((q) => ({
        id: q.id, name: q.name, parentId: q.parentId, questionCount: q.questionCount, children: buildTree(q.id),
      }));
    return c.json(buildTree(null));
  } catch (err) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get qbank tree" } }, 500);
  }
});
