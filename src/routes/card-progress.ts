import { Router, Request, Response } from "express";
import { db, cardProgress, cards, decks } from "../db/index.js";
import { eq, and, isNull, sql, inArray, lte } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { validateBody } from "../middleware/validate.js";
import { reviewCardSchema } from "./validators.js";

const router = Router();

function getUserId(req: Request): string | null {
  return req.isAuthenticated() ? req.user!.id : null;
}

function ownerFilter(userId: string | null) {
  return userId ? eq(cardProgress.userId, userId) : isNull(cardProgress.userId);
}

// ── SM-2 Algorithm ──
// quality: 0=complete blackout, 1=incorrect but remembered on seeing answer,
//          2=incorrect but answer seemed easy to recall,
//          3=correct with serious difficulty, 4=correct with some hesitation,
//          5=perfect response
function sm2Update(
  prev: { easeFactor: number; intervalDays: number; repetitions: number },
  quality: number,
): { easeFactor: number; intervalDays: number; repetitions: number; nextReviewDate: string } {
  let { easeFactor, intervalDays, repetitions } = prev;

  // Update ease factor
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  if (quality >= 3) {
    // Correct response
    repetitions += 1;
    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
  } else {
    // Incorrect — relearn
    repetitions = 0;
    intervalDays = 0;
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + intervalDays);
  const nextReviewDate = nextDate.toISOString().split("T")[0];

  return { easeFactor, intervalDays, repetitions, nextReviewDate };
}

// ── POST /api/cards/:id/review — submit a review for a card ──
router.post("/cards/:id/review", validateBody(reviewCardSchema), async (req: Request, res: Response) => {
  try {
    const cardId = parseInt(req.params.id, 10);
    if (isNaN(cardId)) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid card ID" } });
      return;
    }

    const { quality } = req.body;
    if (typeof quality !== "number" || quality < 0 || quality > 5) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Quality must be 0-5" } });
      return;
    }

    const userId = getUserId(req);

    // Verify card exists
    const card = await db.query.cards.findFirst({ where: eq(cards.id, cardId) });
    if (!card) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Card not found" } });
      return;
    }

    // Get or create progress record
    let progress = await db.query.cardProgress.findFirst({
      where: and(eq(cardProgress.cardId, cardId), ownerFilter(userId)),
    });

    const now = new Date();

    if (!progress) {
      const sm2 = sm2Update({ easeFactor: 2.5, intervalDays: 0, repetitions: 0 }, quality);
      const [created] = await db.insert(cardProgress).values({
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

      res.json({
        nextReviewDate: created.nextReviewDate,
        intervalDays: created.intervalDays,
        easeFactor: created.easeFactor,
        repetitions: created.repetitions,
        newMasteryPct: quality >= 3 ? 20 : 0,
      });
      return;
    }

    const sm2 = sm2Update(
      { easeFactor: progress.easeFactor, intervalDays: progress.intervalDays, repetitions: progress.repetitions },
      quality,
    );

    const [updated] = await db.update(cardProgress).set({
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

    // Calculate mastery: ratio of known to total, weighted by repetitions
    const totalReviews = (updated.knownCount || 0) + (updated.unknownCount || 0);
    const newMasteryPct = totalReviews > 0
      ? Math.min(100, Math.round(((updated.knownCount || 0) / totalReviews) * 100 * Math.min(1, (updated.repetitions || 0) / 5)))
      : 0;

    res.json({
      nextReviewDate: updated.nextReviewDate,
      intervalDays: updated.intervalDays,
      easeFactor: updated.easeFactor,
      repetitions: updated.repetitions,
      newMasteryPct,
    });
  } catch (err) {
    logger.error({ err }, "Failed to record card review");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to record review" } });
  }
});

// ── GET /api/decks/:id/review-queue — cards due for review ──
router.get("/decks/:id/review-queue", async (req: Request, res: Response) => {
  try {
    const deckId = parseInt(req.params.id, 10);
    if (isNaN(deckId)) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } });
      return;
    }

    const userId = getUserId(req);
    const today = new Date().toISOString().split("T")[0];

    // Get all card IDs in this deck (including sub-decks)
    const allDecks = await db.query.decks.findMany();
    function collectDescendantIds(parentId: number): number[] {
      const children = allDecks.filter(d => d.parentId === parentId);
      return [...children.map(d => d.id), ...children.flatMap(c => collectDescendantIds(c.id))];
    }
    const allDeckIds = [deckId, ...collectDescendantIds(deckId)];

    const deckCards = await db.query.cards.findMany({
      where: inArray(cards.deckId, allDeckIds),
    });
    const cardIds = deckCards.map(c => c.id);

    if (cardIds.length === 0) {
      res.json({ cards: [], total: 0 });
      return;
    }

    // Get progress records for cards that are due
    const dueProgress = await db.query.cardProgress.findMany({
      where: and(
        inArray(cardProgress.cardId, cardIds),
        lte(cardProgress.nextReviewDate, today),
        ownerFilter(userId),
      ),
    });

    const dueCardIds = new Set(dueProgress.map(p => p.cardId));
    const dueCards = deckCards
      .filter(c => dueCardIds.has(c.id))
      .map(c => ({
        ...c,
        progress: dueProgress.find(p => p.cardId === c.id),
      }))
      .sort((a, b) => {
        // Sort by urgency: lowest interval first, then oldest review date
        const aInterval = a.progress?.intervalDays ?? 0;
        const bInterval = b.progress?.intervalDays ?? 0;
        return aInterval - bInterval;
      });

    // Also include cards with no progress record (new cards, never studied)
    const studiedCardIds = new Set((await db.query.cardProgress.findMany({
      where: and(inArray(cardProgress.cardId, cardIds), ownerFilter(userId)),
    })).map(p => p.cardId));

    const newCards = deckCards
      .filter(c => !studiedCardIds.has(c.id))
      .map(c => ({ ...c, progress: null }));

    res.json({
      cards: [...dueCards, ...newCards],
      total: dueCards.length + newCards.length,
      dueCount: dueCards.length,
      newCount: newCards.length,
    });
  } catch (err) {
    logger.error({ err }, "Failed to get review queue");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get review queue" } });
  }
});

// ── GET /api/decks/:id/progress — aggregated deck progress ──
router.get("/decks/:id/progress", async (req: Request, res: Response) => {
  try {
    const deckId = parseInt(req.params.id, 10);
    if (isNaN(deckId)) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } });
      return;
    }

    const userId = getUserId(req);
    const today = new Date().toISOString().split("T")[0];

    const allDecks = await db.query.decks.findMany();
    function collectDescendantIds(parentId: number): number[] {
      const children = allDecks.filter(d => d.parentId === parentId);
      return [...children.map(d => d.id), ...children.flatMap(c => collectDescendantIds(c.id))];
    }
    const allDeckIds = [deckId, ...collectDescendantIds(deckId)];

    const deckCards = await db.query.cards.findMany({
      where: inArray(cards.deckId, allDeckIds),
    });
    const total = deckCards.length;

    if (total === 0) {
      res.json({ total: 0, dueToday: 0, mastered: 0, learning: 0, new: 0, masteryPct: 0 });
      return;
    }

    const cardIds = deckCards.map(c => c.id);
    const progressRecords = await db.query.cardProgress.findMany({
      where: and(inArray(cardProgress.cardId, cardIds), ownerFilter(userId)),
    });

    const progressMap = new Map(progressRecords.map(p => [p.cardId, p]));

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

    res.json({ total, dueToday, mastered, learning, new: newCount, masteryPct });
  } catch (err) {
    logger.error({ err }, "Failed to get deck progress");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get deck progress" } });
  }
});

// ── GET /api/review/due-count — global due count for navbar ──
router.get("/review/due-count", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const today = new Date().toISOString().split("T")[0];

    const dueRecords = await db.query.cardProgress.findMany({
      where: and(
        lte(cardProgress.nextReviewDate, today),
        ownerFilter(userId),
      ),
    });

    res.json({ count: dueRecords.length });
  } catch (err) {
    logger.error({ err }, "Failed to get due count");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get due count" } });
  }
});

export default router;
