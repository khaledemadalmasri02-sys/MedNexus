import { Hono } from "hono";
import { eq, and, isNull, sql, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import type { AppEnv } from "../types";
import type { DB } from "../db/index";
import { cardProgress, cards, decks } from "../db/index";
import { validate } from "../middleware/validate";
import { logger } from "../lib/logger";
import { sm2Update } from "../lib/sm2";

export const cardProgressRoutes = new Hono<AppEnv>();

function getDb(c: any): DB { return c.get("db"); }
function getUserId(c: any): string | null { return c.get("user")?.id ?? null; }

function ownerFilter(userId: string | null) {
  return userId ? eq(cardProgress.userId, userId) : isNull(cardProgress.userId);
}

const reviewCardSchema = z.object({
  quality: z.number().int().min(0).max(5),
});

// ── POST /api/cards/:id/review ──
cardProgressRoutes.post("/cards/:id/review", validate(reviewCardSchema), async (c) => {
  try {
    const cardId = parseInt(c.req.param("id") ?? "", 10);
    if (isNaN(cardId)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid card ID" } }, 400);
    }

    const { quality } = c.get("validated") as any;
    if (typeof quality !== "number" || quality < 0 || quality > 5) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Quality must be 0-5" } }, 400);
    }

    const userId = getUserId(c);

    const card = await getDb(c).query.cards.findFirst({ where: eq(cards.id, cardId) });
    if (!card) {
      return c.json({ error: { code: "NOT_FOUND", message: "Card not found" } }, 404);
    }

    let progress = await getDb(c).query.cardProgress.findFirst({
      where: and(eq(cardProgress.cardId, cardId), ownerFilter(userId)),
    });

    const now = new Date();

    if (!progress) {
      const sm2 = sm2Update({ easeFactor: 2.5, intervalDays: 0, repetitions: 0 }, quality);
      const [created] = await getDb(c).insert(cardProgress).values({
        cardId,
        userId: userId || null,
        easeFactor: sm2.easeFactor,
        intervalDays: sm2.intervalDays,
        repetitions: sm2.repetitions,
        nextReviewDate: sm2.nextReviewDate,
        lastStudiedAt: now,
        totalStudiedCount: 1,
        knownCount: quality >= 3 ? 1 : 0,
        unknownCount: quality < 3 ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      }).returning();

      return c.json({
        nextReviewDate: created.nextReviewDate,
        intervalDays: created.intervalDays,
        easeFactor: created.easeFactor,
        repetitions: created.repetitions,
        newMasteryPct: quality >= 3 ? 20 : 0,
      });
    }

    const sm2 = sm2Update(
      { easeFactor: progress.easeFactor, intervalDays: progress.intervalDays, repetitions: progress.repetitions },
      quality,
    );

    const [updated] = await getDb(c).update(cardProgress).set({
      easeFactor: sm2.easeFactor,
      intervalDays: sm2.intervalDays,
      repetitions: sm2.repetitions,
      nextReviewDate: sm2.nextReviewDate,
      lastStudiedAt: now,
      totalStudiedCount: (progress.totalStudiedCount || 0) + 1,
      knownCount: (progress.knownCount || 0) + (quality >= 3 ? 1 : 0),
      unknownCount: (progress.unknownCount || 0) + (quality < 3 ? 1 : 0),
      updatedAt: now,
    }).where(eq(cardProgress.cardId, cardId)).returning();

    const totalReviews = (updated.knownCount || 0) + (updated.unknownCount || 0);
    const newMasteryPct = totalReviews > 0
      ? Math.min(100, Math.round(((updated.knownCount || 0) / totalReviews) * 100 * Math.min(1, (updated.repetitions || 0) / 5)))
      : 0;

    return c.json({
      nextReviewDate: updated.nextReviewDate,
      intervalDays: updated.intervalDays,
      easeFactor: updated.easeFactor,
      repetitions: updated.repetitions,
      newMasteryPct,
    });
  } catch (err) {
    logger.error({ err }, "Failed to record card review");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to record review" } }, 500);
  }
});

// ── GET /api/decks/:id/review-queue ──
cardProgressRoutes.get("/decks/:id/review-queue", async (c) => {
  try {
    const deckId = parseInt(c.req.param("id") ?? "", 10);
    if (isNaN(deckId)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } }, 400);
    }

    const userId = getUserId(c);
    const today = new Date().toISOString().split("T")[0];

    const allDecks = await getDb(c).query.decks.findMany();
    function collectDescendantIds(parentId: number): number[] {
      const children = allDecks.filter((d) => d.parentId === parentId);
      return [...children.map((d) => d.id), ...children.flatMap((ch) => collectDescendantIds(ch.id))];
    }
    const allDeckIds = [deckId, ...collectDescendantIds(deckId)];

    const deckCards = await getDb(c).query.cards.findMany({ where: inArray(cards.deckId, allDeckIds) });
    const cardIds = deckCards.map((cd) => cd.id);

    if (cardIds.length === 0) {
      return c.json({ cards: [], total: 0 });
    }

    const dueProgress = await getDb(c).query.cardProgress.findMany({
      where: and(
        inArray(cardProgress.cardId, cardIds),
        lte(cardProgress.nextReviewDate, today),
        ownerFilter(userId),
      ),
    });

    const dueCardIds = new Set(dueProgress.map((p) => p.cardId));
    const dueCards = deckCards
      .filter((cd) => dueCardIds.has(cd.id))
      .map((cd) => ({
        ...cd,
        progress: dueProgress.find((p) => p.cardId === cd.id),
      }))
      .sort((a, b) => {
        const aInterval = a.progress?.intervalDays ?? 0;
        const bInterval = b.progress?.intervalDays ?? 0;
        return aInterval - bInterval;
      });

    const studiedCardIds = new Set((await getDb(c).query.cardProgress.findMany({
      where: and(inArray(cardProgress.cardId, cardIds), ownerFilter(userId)),
    })).map((p) => p.cardId));

    const newCards = deckCards
      .filter((cd) => !studiedCardIds.has(cd.id))
      .map((cd) => ({ ...cd, progress: null }));

    return c.json({
      cards: [...dueCards, ...newCards],
      total: dueCards.length + newCards.length,
      dueCount: dueCards.length,
      newCount: newCards.length,
    });
  } catch (err) {
    logger.error({ err }, "Failed to get review queue");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get review queue" } }, 500);
  }
});

// ── GET /api/decks/:id/progress ──
cardProgressRoutes.get("/decks/:id/progress", async (c) => {
  try {
    const deckId = parseInt(c.req.param("id") ?? "", 10);
    if (isNaN(deckId)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } }, 400);
    }

    const userId = getUserId(c);
    const today = new Date().toISOString().split("T")[0];

    const allDecks = await getDb(c).query.decks.findMany();
    function collectDescendantIds(parentId: number): number[] {
      const children = allDecks.filter((d) => d.parentId === parentId);
      return [...children.map((d) => d.id), ...children.flatMap((ch) => collectDescendantIds(ch.id))];
    }
    const allDeckIds = [deckId, ...collectDescendantIds(deckId)];

    const deckCards = await getDb(c).query.cards.findMany({ where: inArray(cards.deckId, allDeckIds) });
    const total = deckCards.length;

    if (total === 0) {
      return c.json({ total: 0, dueToday: 0, mastered: 0, learning: 0, new: 0, masteryPct: 0 });
    }

    const cardIds = deckCards.map((cd) => cd.id);
    const progressRecords = await getDb(c).query.cardProgress.findMany({
      where: and(inArray(cardProgress.cardId, cardIds), ownerFilter(userId)),
    });

    const progressMap = new Map(progressRecords.map((p) => [p.cardId, p]));

    let dueToday = 0;
    let mastered = 0;
    let learning = 0;
    let newCount = 0;
    let totalMastery = 0;

    for (const card of deckCards) {
      const p = progressMap.get(card.id);
      if (!p) {
        newCount++;
        continue;
      }

      if (p.nextReviewDate <= today) dueToday++;

      const totalReviews = (p.knownCount || 0) + (p.unknownCount || 0);
      const cardMastery = totalReviews > 0
        ? Math.min(100, Math.round(((p.knownCount || 0) / totalReviews) * 100 * Math.min(1, (p.repetitions || 0) / 5)))
        : 0;
      totalMastery += cardMastery;

      if (cardMastery >= 80 && (p.repetitions || 0) >= 3) {
        mastered++;
      } else if (totalReviews > 0) {
        learning++;
      } else {
        newCount++;
      }
    }

    const studiedCount = total - newCount;
    const masteryPct = studiedCount > 0 ? Math.round(totalMastery / total) : 0;

    return c.json({ total, dueToday, mastered, learning, new: newCount, masteryPct });
  } catch (err) {
    logger.error({ err }, "Failed to get deck progress");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get deck progress" } }, 500);
  }
});

// ── GET /api/review/due-count ──
cardProgressRoutes.get("/review/due-count", async (c) => {
  try {
    const userId = getUserId(c);
    const today = new Date().toISOString().split("T")[0];

    const dueRecords = await getDb(c).query.cardProgress.findMany({
      where: and(
        lte(cardProgress.nextReviewDate, today),
        ownerFilter(userId),
      ),
    });

    return c.json({ count: dueRecords.length });
  } catch (err) {
    logger.error({ err }, "Failed to get due count");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get due count" } }, 500);
  }
});
