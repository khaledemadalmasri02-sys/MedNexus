import { Hono } from "hono";
import { eq, and, isNull, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { AppEnv } from "../types";
import type { DB } from "../db/index";
import { tags, deckTags, qbankTags, decks } from "../db/index";
import { validate } from "../middleware/validate";
import { logger } from "../lib/logger";

export const tagRoutes = new Hono<AppEnv>();

function getDb(c: any): DB { return c.get("db"); }
function getUserId(c: any): string | null { return c.get("user")?.id ?? null; }

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().max(20).optional(),
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().max(20).optional(),
});

const deckTagsSchema = z.object({
  tagIds: z.array(z.number().int().positive()).min(1).max(50),
});

// ── GET /api/tags ──
tagRoutes.get("/tags", async (c) => {
  try {
    const userId = getUserId(c);
    const userTags = await getDb(c).query.tags.findMany({
      where: userId ? eq(tags.userId, userId) : isNull(tags.userId),
    });

    if (userTags.length === 0) {
      return c.json([]);
    }

    const tagIds = userTags.map((t) => t.id);

    const [deckCounts, qbankCounts] = await Promise.all([
      getDb(c).select({ tagId: deckTags.tagId, count: sql<number>`count(*)` })
        .from(deckTags)
        .where(inArray(deckTags.tagId, tagIds))
        .groupBy(deckTags.tagId),
      getDb(c).select({ tagId: qbankTags.tagId, count: sql<number>`count(*)` })
        .from(qbankTags)
        .where(inArray(qbankTags.tagId, tagIds))
        .groupBy(qbankTags.tagId),
    ]);

    const deckCountMap = new Map(deckCounts.map((cc) => [cc.tagId, cc.count]));
    const qbankCountMap = new Map(qbankCounts.map((qc) => [qc.tagId, qc.count]));

    const tagsWithCount = userTags.map((tag) => {
      const deckCount = deckCountMap.get(tag.id) || 0;
      const qbankCount = qbankCountMap.get(tag.id) || 0;
      return {
        ...tag,
        deckCount,
        qbankCount,
        totalCount: deckCount + qbankCount,
      };
    });

    return c.json(tagsWithCount);
  } catch (err) {
    logger.error({ err }, "Failed to list tags");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to list tags" } }, 500);
  }
});

// ── POST /api/tags ──
tagRoutes.post("/tags", validate(createTagSchema), async (c) => {
  const { name, color } = c.get("validated") as any;
  try {
    const userId = getUserId(c);
    const [tag] = await getDb(c).insert(tags).values({ name, color: color || "#06B6D4", userId }).returning();
    return c.json({ ...tag, deckCount: 0, qbankCount: 0, totalCount: 0 }, 201);
  } catch (err) {
    logger.error({ err }, "Failed to create tag");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to create tag" } }, 500);
  }
});

// ── PATCH /api/tags/:id ──
tagRoutes.patch("/tags/:id", validate(updateTagSchema), async (c) => {
  const id = parseInt(c.req.param("id") ?? "", 10);
  if (isNaN(id)) { return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400); }

  const userId = getUserId(c);
  try {
    const existing = await getDb(c).query.tags.findFirst({ where: eq(tags.id, id) });
    if (!existing || (userId && existing.userId !== userId) || (!userId && existing.userId !== null)) {
      return c.json({ error: { code: "NOT_FOUND", message: "Tag not found" } }, 404);
    }

    const { name, color } = c.get("validated") as any;
    const [updated] = await getDb(c).update(tags).set({
      name: name ?? existing.name,
      color: color ?? existing.color,
    }).where(eq(tags.id, id)).returning();

    return c.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update tag");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to update tag" } }, 500);
  }
});

// ── DELETE /api/tags/:id ──
tagRoutes.delete("/tags/:id", async (c) => {
  const id = parseInt(c.req.param("id") ?? "", 10);
  if (isNaN(id)) { return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400); }

  try {
    await getDb(c).delete(deckTags).where(eq(deckTags.tagId, id));
    await getDb(c).delete(qbankTags).where(eq(qbankTags.tagId, id));
    await getDb(c).delete(tags).where(eq(tags.id, id));
    return new Response(null, { status: 204 });
  } catch (err) {
    logger.error({ err }, "Failed to delete tag");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete tag" } }, 500);
  }
});

// ── POST /api/decks/:id/tags ──
tagRoutes.post("/decks/:id/tags", validate(deckTagsSchema), async (c) => {
  const deckId = parseInt(c.req.param("id") ?? "", 10);
  if (isNaN(deckId)) { return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } }, 400); }

  const { tagIds } = c.get("validated") as any;
  if (!Array.isArray(tagIds) || tagIds.length === 0) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "tagIds array required" } }, 400);
  }

  try {
    const userId = getUserId(c);
    const deck = await getDb(c).query.decks.findFirst({ where: eq(decks.id, deckId) });
    if (!deck || (userId && deck.userId !== userId) || (!userId && deck.userId !== null)) {
      return c.json({ error: { code: "NOT_FOUND", message: "Deck not found" } }, 404);
    }

    await getDb(c).insert(deckTags).values(tagIds.map((tagId: number) => ({ deckId, tagId })));
    return c.json({ success: true }, 201);
  } catch (err) {
    logger.error({ err }, "Failed to add tags to deck");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to add tags" } }, 500);
  }
});

// ── DELETE /api/decks/:id/tags/:tagId ──
tagRoutes.delete("/decks/:id/tags/:tagId", async (c) => {
  const deckId = parseInt(c.req.param("id") ?? "", 10);
  const tagId = parseInt(c.req.param("tagId") ?? "", 10);
  if (isNaN(deckId) || isNaN(tagId)) { return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400); }

  try {
    await getDb(c).delete(deckTags).where(and(eq(deckTags.deckId, deckId), eq(deckTags.tagId, tagId)));
    return new Response(null, { status: 204 });
  } catch (err) {
    logger.error({ err }, "Failed to remove tag from deck");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to remove tag" } }, 500);
  }
});
