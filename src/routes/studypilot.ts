import { Hono } from "hono";
import { eq, and, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import type { AppEnv } from "../types";
import type { DB } from "../db/index";
import { studypilotPlans, decks, cards, cardProgress, generationLogs, libraryDecks, libraryCards } from "../db/index";
import { validate } from "../middleware/validate";
import { logger } from "../lib/logger";
import { sm2Update } from "../lib/sm2";
import { createAIService, PartialGenerationError, type GeneratedCard } from "../lib/ai";
import { getConfig } from "../lib/config";
import {
  ingestText,
  clusterModules,
  orderModules,
  buildSchedule,
  detectDifficulty,
  extractTopics,
  buildExplanationHeuristic,
  type RawCard,
  type ModuleCluster,
} from "../studypilot/planner";

export const studypilotRoutes = new Hono<AppEnv>();

function getDb(c: any): DB { return c.get("db"); }
function getUserId(c: any): string | null { return c.get("user")?.id ?? null; }

// Encode difficulty into tags (no schema churn). Format: "topic1,topic2|diff:hard"
function buildTags(card: RawCard): string {
  const topicPart = card.topics.slice(0, 5).join(",");
  return `${topicPart}|diff:${card.difficulty}`.slice(0, 500);
}

// ── AI-fallback helpers (copied from generate.ts; not exported from there) ──
function isAuthError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes("401") ||
    message.includes("402") ||
    message.includes("429") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("bad gateway") ||
    message.includes("unauthorized") ||
    message.includes("api key") ||
    message.includes("user not found") ||
    message.includes("authentication") ||
    message.includes("invalid url") ||
    message.includes("provider returned error") ||
    message.includes("rate limit") ||
    message.includes("quota") ||
    message.includes("too many requests") ||
    message.includes("temporarily unavailable") ||
    message.includes("ai request failed") ||
    message.includes("fetch failed") ||
    message.includes("econnrefused") ||
    message.includes("enotfound")
  );
}

function isParseError(error: Error): boolean {
  return /invalid response format|no json|parse/i.test(error.message);
}

function genOptionsFromEnv(c: any): { concurrency?: number; deadlineMs?: number } {
  const env = c.env as Record<string, string>;
  const concurrency = Number(env.GEN_CONCURRENCY);
  const deadlineMs = Number(env.GEN_DEADLINE_MS);
  return {
    concurrency: Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 5,
    deadlineMs: Number.isFinite(deadlineMs) && deadlineMs > 0 ? deadlineMs : 240_000,
  };
}

async function logGeneration(
  c: any,
  userId: string | null,
  type: string,
  model: string,
  success: boolean,
  errorMessage?: string,
): Promise<void> {
  try {
    await getDb(c).insert(generationLogs).values({
      userId,
      type,
      model,
      success,
      errorMessage,
      createdAt: new Date(),
    });
  } catch {
    /* best-effort logging */
  }
}

const isAiDownError = (err: unknown): boolean => {
  const e = err as Error;
  if (!e) return false;
  return isAuthError(e) || isParseError(e) || /fetch|network|timeout|abort|econn|enotfound|failed to fetch/i.test(e.message);
};

// ── POST /api/studypilot/ingest ──
// Body: { source: "text"|"pdf"|"image", text: string, title?: string }
// AI-first: tries LM Studio to generate cards, silently falling back to the
// heuristic planner if the model is unavailable. Always returns 201 with cards.
const ingestSchema = z.object({
  source: z.enum(["text", "pdf", "image"]),
  text: z.string().min(1).max(1_000_000),
  title: z.string().max(200).optional(),
});

studypilotRoutes.post("/studypilot/ingest", validate(ingestSchema), async (c) => {
  let usedAi = false;
  let partial = false;
  try {
    const { source, text, title } = c.get("validated") as any;
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Login required" } }, 401);
    }

    const cleaned = text.trim();
    const words = cleaned.split(/\s+/).filter(Boolean).length;

    const ai = createAIService(c.env);
    const config = getConfig(c.env);
    const genOptions = genOptionsFromEnv(c);
    const model = config.AI_TEXT_MODEL;

    // ── AI-first card generation ──
    let items: GeneratedCard[] = [];
    try {
      items = await ai.generateCards(cleaned, Math.max(5, Math.ceil(words / 40)), genOptions);
      usedAi = true;
    } catch (e) {
      if (e instanceof PartialGenerationError) {
        items = e.items as GeneratedCard[];
        partial = true;
        usedAi = true;
      } else if (isAiDownError(e)) {
        usedAi = false;
      } else {
        throw e;
      }
    }

    // ── Heuristic fallback when AI produced nothing usable ──
    let clusters: ModuleCluster[];
    let aiCards: boolean;
    if (items.length > 0) {
      aiCards = true;
      usedAi = true;
      clusters = buildClustersFromAi(items);
    } else {
      aiCards = false;
      usedAi = false;
      const rawCards = ingestText(cleaned);
      if (rawCards.length === 0) {
        return c.json({ error: { code: "NO_CONTENT", message: "No cards could be extracted from the text" } }, 422);
      }
      clusters = orderModules(clusterModules(rawCards));
    }

    const db = getDb(c);
    const deckIds: number[] = [];
    let cardCount = 0;

    for (let i = 0; i < clusters.length; i++) {
      const cl = clusters[i];
      const moduleName = cl.name || `Module ${i + 1}`;
      const [deck] = await db
        .insert(decks)
        .values({
          name: title ? `${title} — ${moduleName}` : moduleName,
          description: `StudyPilot module (${cl.difficulty}). ${aiCards ? "AI-generated" : "Auto-clustered"} from ${source} input.`,
          kind: "deck",
          userId,
        })
        .returning();

      deckIds.push(deck.id);

      const values = cl.cards.map((card) => {
        if (aiCards) {
          const rawText = card.front + (card.back ? "\n" + card.back : "");
          return {
            deckId: deck.id,
            front: card.front.slice(0, 10000),
            back: card.back.slice(0, 10000),
            cardType: "basic" as const,
            tags: buildTags(card),
            aiFront: card.front,
            aiBack: card.back,
            aiGenerated: true,
            source: "ai" as const,
          };
        }
        return {
          deckId: deck.id,
          front: card.front.slice(0, 10000),
          back: card.back.slice(0, 10000),
          cardType: "basic" as const,
          tags: buildTags(card),
          aiGenerated: false,
          source: "heuristic" as const,
        };
      });
      if (values.length) {
        await db.insert(cards).values(values);
        cardCount += values.length;
      }
    }

    await logGeneration(c, userId, "studypilot", usedAi ? model : "offline-fallback", true);

    return c.json({
      deckIds,
      moduleCount: clusters.length,
      cardCount,
      usedAi,
      partial,
      modules: clusters.map((cl) => ({
        name: cl.name,
        difficulty: cl.difficulty,
        cardCount: cl.cards.length,
        topics: cl.topics.slice(0, 5),
        source: aiCards ? "ai" : "heuristic",
      })),
    }, 201);
  } catch (err) {
    logger.error({ err }, "StudyPilot ingest failed");
    await logGeneration(c as any, getUserId(c as any), "studypilot", "error", false, (err as Error)?.message);
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to ingest material" } }, 500);
  }
});

// Build ModuleClusters from AI-generated cards, re-deriving difficulty/topics
// from the raw card text so module ordering stays meaningful.
function buildClustersFromAi(items: GeneratedCard[]): ModuleCluster[] {
  const raw: RawCard[] = items.map((it) => {
    const rawText = `${it.front}\n${it.back || ""}`;
    return {
      front: it.front,
      back: it.back || "",
      raw: rawText,
      cardType: "definition" as const,
      difficulty: detectDifficulty(rawText),
      topics: it.tags && it.tags.length ? it.tags.slice(0, 5) : extractTopics(rawText, 5),
    };
  });
  return orderModules(clusterModules(raw));
}

// ── POST /api/studypilot/explain ──
// Body: { cardId: number }
// Coach explanation: return the stored ai_explanation, else generate live via
// AI and persist; on AI error fall back to a heuristic string (source:"heuristic").
const explainSchema = z.object({
  cardId: z.number().int().positive(),
});

studypilotRoutes.post("/studypilot/explain", validate(explainSchema), async (c) => {
  try {
    const { cardId } = c.get("validated") as any;
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Login required" } }, 401);
    }

    const db = getDb(c);
    const card = await db.query.cards.findFirst({ where: eq(cards.id, cardId) });
    if (!card) {
      return c.json({ error: { code: "NOT_FOUND", message: "Card not found" } }, 404);
    }

    if (card.aiExplanation) {
      return c.json({ explanation: card.aiExplanation, source: card.source });
    }

    const front = card.aiFront || card.front;
    const back = card.aiBack || card.back;

    try {
      const ai = createAIService(c.env);
      const genOptions = genOptionsFromEnv(c);
      const text = await ai.explainCard(front, back, "full", genOptions);
      if (text && text.trim()) {
        await db
          .update(cards)
          .set({ aiExplanation: text.trim(), source: "ai" })
          .where(eq(cards.id, cardId));
        return c.json({ explanation: text.trim(), source: "ai" });
      }
    } catch (e) {
      logger.warn({ err: e }, "StudyPilot explain AI failed, returning offline heuristic");
    }

    // Do NOT persist the offline fallback — if we did, the next study session
    // would be stuck with the junk text forever (the route short-circuits on a
    // stored aiExplanation). It is only returned for the current request; a later
    // attempt with working AI will regenerate a real explanation.
    const heuristic = buildExplanationHeuristic(card);
    return c.json({ explanation: heuristic, source: "heuristic" });
  } catch (err) {
    logger.error({ err }, "StudyPilot explain failed");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to explain card" } }, 500);
  }
});

// ── POST /api/studypilot/plan ──
// Body: { dailyMinutes: number, deadline: string (ISO), deckIds?: number[],
//         title?: string }
// Builds a deadline-driven daily schedule and persists one studypilot_plans row.
const planSchema = z.object({
  dailyMinutes: z.number().int().positive().max(1440),
  deadline: z.string().min(1), // ISO date/time
  deckIds: z.array(z.number().int().positive()).optional(),
  title: z.string().max(200).optional(),
});

studypilotRoutes.post("/studypilot/plan", validate(planSchema), async (c) => {
  try {
    const { dailyMinutes, deadline, deckIds, title } = c.get("validated") as any;
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Login required" } }, 401);
    }

    const db = getDb(c);
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid deadline" } }, 400);
    }

    // Resolve target decks: explicit deckIds, else all user-owned decks.
    let targetDecks = await db.query.decks.findMany({
      where: and(eq(decks.userId, userId), eq(decks.kind, "deck")),
    });
    if (deckIds && deckIds.length) {
      const idSet = new Set(deckIds);
      targetDecks = targetDecks.filter((d) => idSet.has(d.id));
    }
    if (targetDecks.length === 0) {
      return c.json({ error: { code: "NO_CONTENT", message: "No decks to plan. Ingest material first." } }, 422);
    }

    // Reconstruct modules (deck -> cards) and order easy->hard by aggregated difficulty.
    const clusters: ModuleCluster[] = [];
    for (const deck of targetDecks) {
      const deckCards = await db.query.cards.findMany({ where: eq(cards.deckId, deck.id) });
      const raw: RawCard[] = deckCards.map((cd) => {
        const diffMatch = (cd.tags || "").match(/diff:(\w+)/);
        const topics = (cd.tags || "")
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t && !t.startsWith("diff:"));
        return {
          front: cd.front,
          back: cd.back,
          raw: cd.front,
          cardType: cd.cardType === "mcq" ? "problem" : "definition",
          difficulty: (diffMatch?.[1] as RawCard["difficulty"]) || "medium",
          topics,
        };
      });
      const rank = (d: string) => (d === "easy" ? 0 : d === "medium" ? 1 : 2);
      const avg = raw.reduce((s, r) => s + rank(r.difficulty), 0) / Math.max(1, raw.length);
      const difficulty = avg < 0.66 ? "easy" : avg < 1.66 ? "medium" : "hard";
      clusters.push({
        name: deck.name,
        topics: [...new Set(raw.flatMap((r) => r.topics))].slice(0, 5),
        difficulty,
        cards: raw,
      });
    }

    const ordered = orderModules(clusters);
    const { days, totalCards } = buildSchedule(ordered, dailyMinutes, deadlineDate);

    if (days.length === 0) {
      return c.json({ error: { code: "NO_CONTENT", message: "No cards to schedule" } }, 422);
    }

    const moduleDeckIds = ordered.map((m) => {
      const deck = targetDecks.find((d) => d.name === m.name);
      return deck?.id;
    }).filter((id): id is number => typeof id === "number");

    const scheduleJson = JSON.stringify({
      dailyMinutes,
      deadline: deadlineDate.toISOString(),
      totalCards,
      modules: ordered.map((m) => ({
        name: m.name,
        difficulty: m.difficulty,
        cardCount: m.cards.length,
        topics: m.topics,
      })),
      days,
    });

    const [plan] = await db
      .insert(studypilotPlans)
      .values({
        userId,
        title: title || "StudyPilot Plan",
        dailyMinutes,
        deadline: deadlineDate,
        scheduleJson,
        moduleDeckIds: JSON.stringify(moduleDeckIds),
      })
      .returning();

    return c.json({
      id: plan.id,
      title: plan.title,
      dailyMinutes: plan.dailyMinutes,
      deadline: plan.deadline,
      totalCards,
      moduleCount: ordered.length,
      schedule: JSON.parse(scheduleJson),
    });
  } catch (err) {
    logger.error({ err }, "StudyPilot plan failed");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to build plan" } }, 500);
  }
});

// ── GET /api/studypilot/plan ── latest plan for the user (or ?planId=)
studypilotRoutes.get("/studypilot/plan", async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Login required" } }, 401);
    }
    const planId = c.req.query("planId");
    const db = getDb(c);
    const where = planId
      ? and(eq(studypilotPlans.userId, userId), eq(studypilotPlans.id, parseInt(planId, 10)))
      : eq(studypilotPlans.userId, userId);

    const plans = await db.query.studypilotPlans.findMany({
      where,
      orderBy: (p: any, { desc }: any) => [desc(p.generatedAt)],
      limit: 1,
    });
    const plan = plans[0];
    if (!plan) return c.json({ plan: null });
    return c.json({
      plan: {
        ...plan,
        schedule: JSON.parse(plan.scheduleJson),
        moduleDeckIds: JSON.parse(plan.moduleDeckIds),
      },
    });
  } catch (err) {
    logger.error({ err }, "StudyPilot get plan failed");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to load plan" } }, 500);
  }
});

// ── GET /api/studypilot/modules ── module decks (ordered) with counts + difficulty
studypilotRoutes.get("/studypilot/modules", async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Login required" } }, 401);
    }
    const db = getDb(c);
    const userDecks = await db.query.decks.findMany({
      where: and(eq(decks.userId, userId), eq(decks.kind, "deck")),
    });
    const result = await Promise.all(
      userDecks.map(async (deck) => {
        const deckCards = await db.query.cards.findMany({ where: eq(cards.deckId, deck.id) });
        const rank = (d: string) => (d === "easy" ? 0 : d === "medium" ? 1 : 2);
        const diffs = deckCards
          .map((cd) => (cd.tags || "").match(/diff:(\w+)/)?.[1])
          .filter(Boolean) as string[];
        const avg = diffs.length ? diffs.reduce((s, d) => s + rank(d), 0) / diffs.length : 1;
        const difficulty = avg < 0.66 ? "easy" : avg < 1.66 ? "medium" : "hard";
        return {
          deckId: deck.id,
          name: deck.name,
          cardCount: deckCards.length,
          difficulty,
          topics: [
            ...new Set(
              deckCards.flatMap((cd) =>
                (cd.tags || "").split(",").map((t) => t.trim()).filter((t) => t && !t.startsWith("diff:"))
              )
            ),
          ].slice(0, 5),
        };
      })
    );
    const order = { easy: 0, medium: 1, hard: 2 } as Record<string, number>;
    result.sort((a, b) => order[a.difficulty] - order[b.difficulty] || b.cardCount - a.cardCount);
    return c.json({ modules: result });
  } catch (err) {
    logger.error({ err }, "StudyPilot modules failed");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to load modules" } }, 500);
  }
});

// ── GET /api/studypilot/plan/:id/cards ── ordered cards that follow a saved plan
// Respects the plan's moduleDeckIds ordering (easy→hard) so "start study" walks
// the exact schedule the user built, not every deck they own.
studypilotRoutes.get("/studypilot/plan/:id/cards", async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Login required" } }, 401);
    }
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid plan id" } }, 400);
    }
    const plan = await getDb(c).query.studypilotPlans.findFirst({
      where: and(eq(studypilotPlans.id, id), eq(studypilotPlans.userId, userId)),
    });
    if (!plan) return c.json({ error: { code: "NOT_FOUND", message: "Plan not found" } }, 404);

    const deckIds: number[] = JSON.parse(plan.moduleDeckIds) as number[];
    if (deckIds.length === 0) {
      return c.json({ planTitle: plan.title, modules: [], totalCards: 0 });
    }

    const byDeck = new Map<number, any[]>();
    for (const did of deckIds) {
      const deckCards = await getDb(c).query.cards.findMany({ where: eq(cards.deckId, did) });
      byDeck.set(did, deckCards);
    }

    // Reconstruct module metadata from the stored schedule (names/difficulty/count).
    const sched = JSON.parse(plan.scheduleJson) as { modules: Array<{ name: string; difficulty: string; cardCount: number }> };
    const deckNameById = new Map<number, string>(
      (await getDb(c).query.decks.findMany({ where: inArray(decks.id, deckIds) })).map((d) => [d.id, d.name])
    );

    const modules = deckIds.map((did, i) => {
      const deckCards = byDeck.get(did) ?? [];
      const schedMod = sched.modules[i] ?? { name: deckNameById.get(did) ?? `Module ${i + 1}`, difficulty: "medium", cardCount: deckCards.length };
      return {
        deckId: did,
        name: schedMod.name,
        difficulty: schedMod.difficulty,
        cardCount: deckCards.length,
        cards: deckCards.map((cd) => ({
          id: cd.id,
          front: cd.front,
          back: cd.back,
          tags: cd.tags,
          cardType: cd.cardType,
          aiFront: cd.aiFront,
          aiBack: cd.aiBack,
          aiExplanation: cd.aiExplanation,
          source: cd.source,
        })),
      };
    });

    const totalCards = modules.reduce((s, m) => s + m.cards.length, 0);
    return c.json({ planTitle: plan.title, modules, totalCards });
  } catch (err) {
    logger.error({ err }, "StudyPilot plan cards failed");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to load plan cards" } }, 500);
  }
});

// ── GET /api/studypilot/due ── due + new cards across plan (or all) decks
studypilotRoutes.get("/studypilot/due", async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Login required" } }, 401);
    }
    const db = getDb(c);
    const today = new Date().toISOString().split("T")[0];
    const planId = c.req.query("planId");

    let deckIds: number[] | null = null;
    if (planId) {
      const plan = await db.query.studypilotPlans.findFirst({
        where: and(eq(studypilotPlans.id, parseInt(planId, 10)), eq(studypilotPlans.userId, userId)),
      });
      if (plan) deckIds = JSON.parse(plan.moduleDeckIds) as number[];
    }

    const allCards = deckIds
      ? await db.query.cards.findMany({ where: inArray(cards.deckId, deckIds) })
      : await db.query.cards.findMany();
    const cardIds = allCards.map((cd) => cd.id);
    if (cardIds.length === 0) {
      return c.json({ cards: [], total: 0, dueCount: 0, newCount: 0 });
    }

    const dueProgress = await db.query.cardProgress.findMany({
      where: and(inArray(cardProgress.cardId, cardIds), lte(cardProgress.nextReviewDate, today), eq(cardProgress.userId, userId)),
    });
    const studiedIds = new Set(
      (await db.query.cardProgress.findMany({ where: and(inArray(cardProgress.cardId, cardIds), eq(cardProgress.userId, userId)) })).map((p) => p.cardId)
    );

    const dueCardIds = new Set(dueProgress.map((p) => p.cardId));
    const dueCards = allCards
      .filter((cd) => dueCardIds.has(cd.id))
      .map((cd) => ({ ...cd, progress: dueProgress.find((p) => p.cardId === cd.id) }));
    const newCards = allCards.filter((cd) => !studiedIds.has(cd.id)).map((cd) => ({ ...cd, progress: null }));

    return c.json({
      cards: [...dueCards, ...newCards],
      total: dueCards.length + newCards.length,
      dueCount: dueCards.length,
      newCount: newCards.length,
    });
  } catch (err) {
    logger.error({ err }, "StudyPilot due failed");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to load due cards" } }, 500);
  }
});

// ── POST /api/studypilot/progress ── delegate to SM-2 (quality 0-5)
const progressSchema = z.object({
  cardId: z.number().int().positive(),
  quality: z.number().int().min(0).max(5),
});

studypilotRoutes.post("/studypilot/progress", validate(progressSchema), async (c) => {
  try {
    const { cardId, quality } = c.get("validated") as any;
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Login required" } }, 401);
    }
    const db = getDb(c);

    const card = await db.query.cards.findFirst({ where: eq(cards.id, cardId) });
    if (!card) {
      return c.json({ error: { code: "NOT_FOUND", message: "Card not found" } }, 404);
    }

    let progress = await db.query.cardProgress.findFirst({
      where: and(eq(cardProgress.cardId, cardId), eq(cardProgress.userId, userId)),
    });
    const now = new Date();

    if (!progress) {
      const sm2 = sm2Update({ easeFactor: 2.5, intervalDays: 0, repetitions: 0 }, quality);
      const [created] = await db
        .insert(cardProgress)
        .values({
          cardId,
          userId,
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
        })
        .returning();
      return c.json({
        nextReviewDate: created.nextReviewDate,
        intervalDays: created.intervalDays,
        easeFactor: created.easeFactor,
        repetitions: created.repetitions,
        masteryPct: quality >= 3 ? 20 : 0,
      });
    }

    const sm2 = sm2Update(
      { easeFactor: progress.easeFactor, intervalDays: progress.intervalDays, repetitions: progress.repetitions },
      quality
    );
    const [updated] = await db
      .update(cardProgress)
      .set({
        easeFactor: sm2.easeFactor,
        intervalDays: sm2.intervalDays,
        repetitions: sm2.repetitions,
        nextReviewDate: sm2.nextReviewDate,
        lastStudiedAt: now,
        totalStudiedCount: (progress.totalStudiedCount || 0) + 1,
        knownCount: (progress.knownCount || 0) + (quality >= 3 ? 1 : 0),
        unknownCount: (progress.unknownCount || 0) + (quality < 3 ? 1 : 0),
        updatedAt: now,
      })
      .where(eq(cardProgress.cardId, cardId))
      .returning();

    const totalReviews = (updated.knownCount || 0) + (updated.unknownCount || 0);
    const masteryPct =
      totalReviews > 0
        ? Math.min(100, Math.round(((updated.knownCount || 0) / totalReviews) * 100 * Math.min(1, (updated.repetitions || 0) / 5)))
        : 0;
    return c.json({
      nextReviewDate: updated.nextReviewDate,
      intervalDays: updated.intervalDays,
      easeFactor: updated.easeFactor,
      repetitions: updated.repetitions,
      masteryPct,
    });
  } catch (err) {
    logger.error({ err }, "StudyPilot progress failed");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to record progress" } }, 500);
  }
});

// ── GET /api/studypilot/library ── list curated library decks
// Optional ?category= and ?q= (name/description/tags search). cardCount is the
// denormalized value kept in sync by the seeding/clone path.
studypilotRoutes.get("/studypilot/library", async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Login required" } }, 401);
    }
    const db = getDb(c);
    const category = c.req.query("category");
    const q = (c.req.query("q") || "").trim().toLowerCase();

    const all = await db.query.libraryDecks.findMany({ orderBy: (d: any, { desc }: any) => [desc(d.createdAt)] });
    const filtered = all.filter((d) => {
      if (category && d.category !== category) return false;
      if (!q) return true;
      const hay = `${d.name} ${d.description || ""} ${d.tags || ""}`.toLowerCase();
      return hay.includes(q);
    });

    const categories = [...new Set(all.map((d) => d.category))];
    return c.json({
      decks: filtered.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        category: d.category,
        tags: d.tags,
        difficulty: d.difficulty,
        cardCount: d.cardCount,
      })),
      categories,
    });
  } catch (err) {
    logger.error({ err }, "StudyPilot library list failed");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to load library" } }, 500);
  }
});

// ── GET /api/studypilot/library/:id ── one library deck with its cards (preview)
studypilotRoutes.get("/studypilot/library/:id", async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Login required" } }, 401);
    }
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck id" } }, 400);
    }
    const db = getDb(c);
    const deck = await db.query.libraryDecks.findFirst({ where: eq(libraryDecks.id, id) });
    if (!deck) {
      return c.json({ error: { code: "NOT_FOUND", message: "Library deck not found" } }, 404);
    }
    const deckCards = await db.query.libraryCards.findMany({ where: eq(libraryCards.libraryDeckId, id) });
    return c.json({
      deck: {
        id: deck.id,
        name: deck.name,
        description: deck.description,
        category: deck.category,
        tags: deck.tags,
        difficulty: deck.difficulty,
        cardCount: deck.cardCount,
      },
      cards: deckCards.map((cd) => ({
        id: cd.id,
        front: cd.front,
        back: cd.back,
        tags: cd.tags,
        cardType: cd.cardType,
        difficulty: cd.difficulty,
        aiFront: cd.aiFront,
        aiBack: cd.aiBack,
        aiExplanation: cd.aiExplanation,
        source: cd.source,
      })),
    });
  } catch (err) {
    logger.error({ err }, "StudyPilot library get failed");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to load library deck" } }, 500);
  }
});

// ── POST /api/studypilot/library/:id/clone ── deep-copy into user-owned deck
// Inserts a new `decks` row + copies of every `libraryCards` row into `cards`.
// Tags keep the `topics|diff:X` encoding so Plan/Modules difficulty ordering works.
studypilotRoutes.post("/studypilot/library/:id/clone", async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Login required" } }, 401);
    }
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck id" } }, 400);
    }
    const db = getDb(c);

    const deck = await db.query.libraryDecks.findFirst({ where: eq(libraryDecks.id, id) });
    if (!deck) {
      return c.json({ error: { code: "NOT_FOUND", message: "Library deck not found" } }, 404);
    }
    const deckCards = await db.query.libraryCards.findMany({ where: eq(libraryCards.libraryDeckId, id) });

    const [newDeck] = await db
      .insert(decks)
      .values({
        name: `Library: ${deck.name}`,
        description: deck.description,
        kind: "deck",
        userId,
      })
      .returning();

    if (deckCards.length) {
      const values = deckCards.map((cd) => {
        const topics = (cd.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
        const topicPart = topics.slice(0, 5).join(",");
        const diff = cd.difficulty && ["easy", "medium", "hard"].includes(cd.difficulty) ? cd.difficulty : deck.difficulty || "medium";
        const encodedTags = `${topicPart}|diff:${diff}`.slice(0, 500);
        return {
          deckId: newDeck.id,
          front: cd.front.slice(0, 10000),
          back: cd.back.slice(0, 10000),
          tags: encodedTags,
          cardType: cd.cardType || "basic",
          aiFront: cd.aiFront,
          aiBack: cd.aiBack,
          aiExplanation: cd.aiExplanation,
          aiGenerated: Boolean(cd.aiFront || cd.aiBack || cd.aiExplanation),
          source: cd.source,
        };
      });
      await db.insert(cards).values(values);
    }

    return c.json({ deckId: newDeck.id, cardCount: deckCards.length }, 201);
  } catch (err) {
    logger.error({ err }, "StudyPilot library clone failed");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to clone library deck" } }, 500);
  }
});
