import { Hono } from "hono";
import { eq, and, gte, lte, inArray, desc, sql, gt } from "drizzle-orm";
import type { AppEnv } from "../types";
import {
  chatMessages, agentUsage, decks, cards, cardProgress, studySessions,
  exams, groupStudyRooms, agentKnowledge, agentResponseCache, agentCacheAnalytics,
} from "../db/index";
import { getDb, getUserId, readJson, unauthorized, serverError } from "../lib/helpers";
import { createAIService } from "../lib/ai";
import { getConfig } from "../lib/config";

export const agentRoutes = new Hono<AppEnv>();

function aiAvailable(c: any): boolean {
  try {
    return createAIService(c.env).hasAnyProvider();
  } catch {
    return false;
  }
}

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return raw.split(",").map((t) => t.trim()).filter(Boolean);
  }
}

function trackUsage(db: any, userId: string, agentId: string, tokensUsed: number, durationMs: number, success: boolean) {
  db.insert(agentUsage).values({
    userId,
    agentId,
    tokensUsed,
    durationMs,
    success,
    createdAt: new Date(),
  }).catch(() => {});
}

// ---- Inline agent cache (replaces lib/agent-cache.ts; uses D1 tables) ----

function normalize(q: string): string {
  return q.toLowerCase().trim().replace(/[?!.,;:'"]/g, "").replace(/\s+/g, " ");
}

async function hash(q: string): Promise<string> {
  const data = new TextEncoder().encode(normalize(q));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function tokenize(q: string): string[] {
  return normalize(q).split(/\s+/).filter((w) => w.length > 2);
}

async function trackAnalytics(db: any, agentId: string, type: string) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const existing = await db.query.agentCacheAnalytics.findFirst({
      where: and(eq(agentCacheAnalytics.agentId, agentId), eq(agentCacheAnalytics.date, today)),
    });
    if (existing) {
      const u: any = { totalQuestions: sql`${agentCacheAnalytics.totalQuestions} + 1` };
      if (type === "memory_hit") u.memoryHits = sql`${agentCacheAnalytics.memoryHits} + 1`;
      if (type === "knowledge_hit") u.knowledgeHits = sql`${agentCacheAnalytics.knowledgeHits} + 1`;
      if (type === "db_cache_hit") u.dbCacheHits = sql`${agentCacheAnalytics.dbCacheHits} + 1`;
      if (type === "miss") u.apiCalls = sql`${agentCacheAnalytics.apiCalls} + 1`;
      await db.update(agentCacheAnalytics).set(u).where(eq(agentCacheAnalytics.id, existing.id));
    } else {
      await db.insert(agentCacheAnalytics).values({
        agentId,
        date: today,
        totalQuestions: 1,
        memoryHits: type === "memory_hit" ? 1 : 0,
        knowledgeHits: type === "knowledge_hit" ? 1 : 0,
        dbCacheHits: type === "db_cache_hit" ? 1 : 0,
        apiCalls: type === "miss" ? 1 : 0,
      });
    }
  } catch { /* ignore analytics errors */ }
}

async function searchKnowledgeBase(db: any, agentId: string, question: string): Promise<{ answer: string } | null> {
  const keywords = tokenize(question);
  if (keywords.length === 0) return null;
  const entries = await db.query.agentKnowledge.findMany({
    where: and(eq(agentKnowledge.agentId, agentId), eq(agentKnowledge.isActive, true)),
    orderBy: [desc(agentKnowledge.priority)],
    limit: 20,
  });
  let bestMatch: { answer: string; score: number } | null = null;
  for (const entry of entries) {
    let score = 0;
    let entryKeywords: string[] = [];
    try { entryKeywords = JSON.parse(entry.keywords as string); } catch { entryKeywords = []; }
    for (const kw of keywords) {
      for (const ekw of entryKeywords) {
        if (ekw.includes(kw) || kw.includes(ekw)) score += 5;
      }
    }
    score += (entry.priority || 0) * 0.3;
    if (score > 8 && (!bestMatch || score > bestMatch.score)) bestMatch = { answer: entry.answer, score };
  }
  return bestMatch ? { answer: bestMatch.answer } : null;
}

async function getCachedResponse(db: any, agentId: string, question: string): Promise<{ answer: string; source: "knowledge" | "ai"; confidence: number } | null> {
  const hashKey = await hash(question);

  const knowledgeHit = await searchKnowledgeBase(db, agentId, question);
  if (knowledgeHit) {
    await trackAnalytics(db, agentId, "knowledge_hit");
    return { answer: knowledgeHit.answer, source: "knowledge", confidence: 0.95 };
  }

  const dbEntry = await db.query.agentResponseCache.findFirst({
    where: and(
      eq(agentResponseCache.agentId, agentId),
      eq(agentResponseCache.questionHash, hashKey),
      gt(agentResponseCache.expiresAt, new Date()),
    ),
  });
  if (dbEntry) {
    await db.update(agentResponseCache).set({ hitCount: sql`${agentResponseCache.hitCount} + 1`, lastHitAt: new Date() }).where(eq(agentResponseCache.id, dbEntry.id));
    await trackAnalytics(db, agentId, "db_cache_hit");
    return { answer: dbEntry.answer, source: "ai", confidence: dbEntry.confidence };
  }

  await trackAnalytics(db, agentId, "miss");
  return null;
}

async function storeCachedResponse(db: any, agentId: string, question: string, answer: string, source: "ai" | "knowledge" = "ai", confidence: number = 0.8) {
  const hashKey = await hash(question);
  const now = new Date();
  const expires = new Date(now.getTime() + 86400000);
  try {
    await db.insert(agentResponseCache).values({
      agentId,
      questionHash: hashKey,
      questionOriginal: question.substring(0, 500),
      answer,
      source,
      confidence,
      expiresAt: expires,
    });
  } catch {
    await db.update(agentResponseCache).set({ answer, hitCount: 1, lastHitAt: now, expiresAt: expires }).where(
      and(eq(agentResponseCache.agentId, agentId), eq(agentResponseCache.questionHash, hashKey)),
    );
  }
}

async function searchKnowledge(db: any, agentId: string, query: string, limit = 5) {
  const keywords = tokenize(query);
  const entries = await db.query.agentKnowledge.findMany({
    where: and(eq(agentKnowledge.agentId, agentId), eq(agentKnowledge.isActive, true)),
    orderBy: [desc(agentKnowledge.priority)],
    limit: 20,
  });
  return entries.map((entry: any) => {
    let entryKeywords: string[] = [];
    try { entryKeywords = JSON.parse(entry.keywords as string); } catch { entryKeywords = []; }
    let score = 0;
    for (const kw of keywords) {
      for (const ekw of entryKeywords) {
        if (ekw.includes(kw) || kw.includes(ekw)) score += 5;
      }
    }
    score += (entry.priority || 0) * 0.3;
    return { id: entry.id, question: entry.question, answer: entry.answer, category: entry.category, score };
  }).filter((s: any) => s.score > 3).sort((a: any, b: any) => b.score - a.score).slice(0, limit);
}

// ---- Routes ----

// POST /api/agents/chat
agentRoutes.post("/agents/chat", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  const db = getDb(c);
  const body = await readJson(c);
  const { message, deckId, mode } = body as { message?: string; deckId?: number; mode?: string };
  const startTime = Date.now();

  if (!message) {
    return c.json({ error: { code: "INVALID_INPUT", message: "Message is required" } }, 400);
  }

  if (!aiAvailable(c)) {
    const encoder = new TextEncoder();
    const message = "The AI Study Buddy requires an API key to be configured. Set OPENROUTER_API_KEY, OPENAI_API_KEY, GROQ_API_KEY, MISTRAL_API_KEY, or GOOGLE_AI_API_KEY in your wrangler env to enable responses.";
    const s = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: message })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new Response(s, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const chatMode = mode === "brief" ? "brief" : "academic";

  try {
    let deckContext = "";
    if (deckId) {
      const deck = await db.query.decks.findFirst({ where: eq(decks.id, deckId) });
      const cardCount = await db.query.cards.findMany({ where: eq(cards.deckId, deckId) });
      if (deck) {
        deckContext = `\n\nUser is studying deck: "${deck.name}" (${cardCount.length} cards)`;
      }
    }

    const recentSessions = await db.query.studySessions.findMany({
      where: and(eq(studySessions.userId, userId), gte(studySessions.startedAt, new Date(Date.now() - 7 * 86400000))),
      orderBy: [desc(studySessions.startedAt)],
      limit: 5,
    });

    if (recentSessions.length > 0) {
      deckContext += `\n\nRecent study activity: ${recentSessions.map((s: any) => `${s.cardsStudied} cards studied`).join(", ")}`;
    }

    const recentCards = await db.query.cards.findMany({
      where: deckId ? eq(cards.deckId, deckId) : undefined,
      limit: 5,
      orderBy: [desc(cards.updatedAt)],
    });

    let cardContext = "";
    if (recentCards.length > 0) {
      cardContext = "\n\nRelevant cards from user's collection:\n" + recentCards.map((crd: any) => `Q: ${crd.front}\nA: ${crd.back}`).join("\n\n");
    }

    await db.insert(chatMessages).values({ userId, role: "user", content: message, deckContext: deckId ? String(deckId) : null, createdAt: new Date() });

    const cached = await getCachedResponse(db, "study-buddy", message);
    if (cached) {
      await db.insert(chatMessages).values({ userId, role: "assistant", content: cached.answer, deckContext: deckId ? String(deckId) : null, createdAt: new Date() });
      trackUsage(db, userId, "study-buddy", 0, Date.now() - startTime, true);
      const cachedEncoder = new TextEncoder();
      const cachedStream = new ReadableStream({
        start(controller) {
          controller.enqueue(cachedEncoder.encode(`data: ${JSON.stringify({ chunk: cached.answer })}\n\n`));
          controller.enqueue(cachedEncoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(cachedStream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const modeInstruction = chatMode === "brief"
      ? "\n\nResponse style: BRIEF mode. Provide concise, short answers. Use bullet points where appropriate. Keep responses under 150 words. Focus on the essential information only. Do not use lengthy explanations or extensive formatting."
      : "\n\nResponse style: ACADEMIC mode. Provide detailed, scholarly explanations. Use full markdown formatting with headings, subheadings, and structured sections. Include pathophysiology, clinical relevance, and key takeaways. Be thorough and educational. Use tables, blockquotes, and bold text for emphasis where appropriate.";

    const systemPrompt = `You are Study Buddy, an AI medical tutor for medical students using MedNexus. Your role is to:

- Explain medical concepts clearly and accurately
- Answer questions about any medical topic (anatomy, physiology, pathology, pharmacology, clinical medicine, etc.)
- Help students understand mechanisms, diagnoses, treatments, and clinical reasoning
- Provide mnemonics, memory aids, and study tips
- Reference the user's study material when relevant
- Use markdown formatting for clear, structured responses

You are NOT a general support chatbot. You are a medical education tutor. Always answer medical and educational questions helpfully and thoroughly.${modeInstruction}${deckContext}${cardContext}`;

    const maxTokens = chatMode === "brief" ? 1024 : 8192;

    const knowledgeEntries = await searchKnowledge(db, "study-buddy", message, 3);
    const knowledgeContext = knowledgeEntries.length > 0
      ? "\n\nRelevant reference material:\n" + knowledgeEntries.map((e: any) => `Q: ${e.question}\nA: ${e.answer}`).join("\n\n")
      : "";

    const ai = createAIService(c.env);
    const stream = ai.streamComplete([
      { role: "system", content: systemPrompt + knowledgeContext },
      { role: "user", content: message },
    ], { model: getConfig(c.env).STUDY_BUDDY_MODEL, maxTokens: maxTokens, temperature: 0.7 });

    const encoder = new TextEncoder();
    const s = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        try {
          for await (const chunk of stream) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          await storeCachedResponse(db, "study-buddy", message, fullResponse, "ai", 0.8);
          await db.insert(chatMessages).values({ userId, role: "assistant", content: fullResponse, deckContext: deckId ? String(deckId) : null, createdAt: new Date() });
          trackUsage(db, userId, "study-buddy", 0, Date.now() - startTime, true);
        } catch (err) {
          trackUsage(db, userId, "study-buddy", 0, Date.now() - startTime, false);
          const reason = err instanceof Error ? err.message : String(err);
          const lower = reason.toLowerCase();
          let message = "The AI service is unavailable right now (check your API key / quota).";
          if (lower.includes("rate limit") || lower.includes("429")) {
            message = "OpenRouter free-tier daily request limit reached. Add credits at openrouter.ai to raise the limit (or wait for the daily reset).";
          } else if (lower.includes("quota") || lower.includes("402") || lower.includes("payment")) {
            message = "OpenRouter quota/credit limit reached. Please add credits to your OpenRouter account.";
          } else if (lower.includes("401") || lower.includes("unauthorized") || lower.includes("api key") || lower.includes("no api key")) {
            message = "The AI provider rejected the API key. Please check your OPENROUTER_API_KEY.";
          } else if (lower.includes("timed out")) {
            message = "The AI service took too long to respond. Please try again.";
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: message })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(s, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    trackUsage(db, userId, "study-buddy", 0, Date.now() - startTime, false);
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Chat failed" } }, 500);
  }
});

// GET /api/agents/chat/history
agentRoutes.get("/agents/chat/history", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  try {
    const db = getDb(c);
    const limit = Math.min(parseInt(c.req.query("limit") || "") || 50, 100);
    const beforeParam = c.req.query("before");
    const before = beforeParam ? new Date(beforeParam) : new Date();
    const beforeDate = isNaN(before.getTime()) ? new Date() : before;

    const messages = await db.query.chatMessages.findMany({
      where: and(eq(chatMessages.userId, userId), lte(chatMessages.createdAt, beforeDate)),
      orderBy: [desc(chatMessages.createdAt)],
      limit,
    });

    return c.json({ messages: messages.reverse() });
  } catch (err) {
    return serverError(c, "Failed to get chat history");
  }
});

// DELETE /api/agents/chat/history
agentRoutes.delete("/agents/chat/history", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  try {
    const db = getDb(c);
    await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
    return c.json({ success: true });
  } catch (err) {
    return serverError(c, "Failed to clear chat");
  }
});

// POST /api/agents/smart-review
agentRoutes.post("/agents/smart-review", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  const db = getDb(c);
  const body = await readJson(c);
  const { deckId, count = 30 } = body as { deckId?: number; count?: number };
  const startTime = Date.now();

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const sessions = await db.query.studySessions.findMany({
      where: and(eq(studySessions.userId, userId), gte(studySessions.startedAt, thirtyDaysAgo)),
    });

    const deckFilter = deckId ? eq(cards.deckId, deckId) : undefined;
    const allCards = await db.query.cards.findMany({ where: deckFilter });

    const cardProgressMap = new Map<number, { known: number; unknown: number; total: number; lastStudiedAt: Date | null }>();
    for (const card of allCards) {
      const progress = await db.query.cardProgress.findFirst({
        where: and(eq(cardProgress.cardId, card.id), eq(cardProgress.userId, userId)),
      });
      if (progress) {
        cardProgressMap.set(card.id, {
          known: progress.knownCount,
          unknown: progress.unknownCount,
          total: progress.totalStudiedCount,
          lastStudiedAt: progress.lastStudiedAt,
        });
      }
    }

    const weakCards: any[] = [];
    const overdueCards: any[] = [];
    const atRiskCards: any[] = [];

    for (const card of allCards) {
      const progress = cardProgressMap.get(card.id);
      if (progress && progress.total > 0) {
        const ratio = progress.known / progress.total;
        if (ratio < 0.5) weakCards.push({ ...card, reason: `Low accuracy (${Math.round(ratio * 100)}%)`, score: ratio });
        if (progress.total >= 3 && ratio < 0.7) atRiskCards.push({ ...card, reason: "Needs reinforcement", score: ratio });
      }
      if (progress) {
        const daysSinceStudy = progress.lastStudiedAt ? (Date.now() - new Date(progress.lastStudiedAt as any).getTime()) / 86400000 : 0;
        if (daysSinceStudy > 7) overdueCards.push({ ...card, reason: `Not studied recently`, score: 0.5 });
      }
    }

    const prioritized = [
      ...weakCards.sort((a: any, b: any) => a.score - b.score),
      ...atRiskCards.filter((crd: any) => !weakCards.find((w: any) => w.id === crd.id)),
      ...overdueCards.filter((crd: any) => !weakCards.find((w: any) => w.id === crd.id) && !atRiskCards.find((a: any) => a.id === crd.id)),
    ].slice(0, count);

    if (prioritized.length < count) {
      const existingIds = new Set(prioritized.map((crd: any) => crd.id));
      const remaining = allCards.filter((crd: any) => !existingIds.has(crd.id)).slice(0, count - prioritized.length);
      prioritized.push(...remaining.map((crd: any) => ({ ...crd, reason: "New card", score: 0.5 })));
    }

    const tagCounts: Record<string, { total: number; weak: number }> = {};
    for (const card of weakCards) {
      for (const tag of parseTags(card.tags)) {
        if (!tagCounts[tag]) tagCounts[tag] = { total: 0, weak: 0 };
        tagCounts[tag].weak++;
      }
    }
    for (const card of allCards) {
      for (const tag of parseTags(card.tags)) {
        if (!tagCounts[tag]) tagCounts[tag] = { total: 0, weak: 0 };
        tagCounts[tag].total++;
      }
    }

    const focusAreas = Object.entries(tagCounts)
      .filter(([, v]) => v.weak > 0)
      .sort((a: any, b: any) => b[1].weak - a[1].weak)
      .slice(0, 5)
      .map(([tag]) => tag);

    const reasoning = `Analyzed ${sessions.length} study sessions over the last 30 days. Found ${weakCards.length} weak cards (below 50% accuracy), ${overdueCards.length} overdue cards, and ${atRiskCards.length} at-risk cards. Generated a targeted review of ${prioritized.length} cards.`;
    trackUsage(db, userId, "smart-review", 0, Date.now() - startTime, true);
    return c.json({
      cards: prioritized,
      reasoning,
      focusAreas,
      estimatedTime: Math.ceil(prioritized.length * 1.5),
      stats: {
        totalCards: allCards.length,
        weakCards: weakCards.length,
        overdueCards: overdueCards.length,
        atRiskCards: atRiskCards.length,
        studySessions: sessions.length,
      },
    });
  } catch (err) {
    trackUsage(db, userId, "smart-review", 0, Date.now() - startTime, false);
    return serverError(c, "Smart review failed");
  }
});

// POST /api/agents/deck-doctor
agentRoutes.post("/agents/deck-doctor", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  const db = getDb(c);
  const body = await readJson(c);
  const { deckId } = body as { deckId: number };
  const startTime = Date.now();

  if (!deckId) {
    return c.json({ error: { code: "INVALID_INPUT", message: "deckId is required" } }, 400);
  }

  try {
    const deckCards = await db.query.cards.findMany({ where: eq(cards.deckId, deckId) });
    if (deckCards.length === 0) {
      return c.json({ healthScore: 100, issues: [], fixes: [], message: "Deck is empty" });
    }

    const issues: any[] = [];
    const fixes: any[] = [];

    const fronts = deckCards.map((crd: any) => crd.front.toLowerCase().trim());
    for (let i = 0; i < deckCards.length; i++) {
      for (let j = i + 1; j < deckCards.length; j++) {
        const a = fronts[i];
        const b = fronts[j];
        const longer = Math.max(a.length, b.length);
        if (longer === 0) continue;
        let matches = 0;
        const minLen = Math.min(a.length, b.length);
        for (let k = 0; k < minLen; k++) {
          if (a[k] === b[k]) matches++;
        }
        const similarity = matches / longer;
        if (similarity > 0.8) {
          issues.push({
            type: "duplicate",
            severity: "warning",
            cardId: deckCards[j].id,
            relatedCardId: deckCards[i].id,
            message: `Card "${deckCards[j].front.slice(0, 50)}..." is ${Math.round(similarity * 100)}% similar to "${deckCards[i].front.slice(0, 50)}..."`,
          });
          fixes.push({
            type: "merge",
            cardId: deckCards[j].id,
            relatedCardId: deckCards[i].id,
            message: "Merge duplicate cards",
          });
        }
      }
    }

    for (const card of deckCards) {
      if (!card.explanationFull) {
        issues.push({
          type: "missing_explanation",
          severity: "info",
          cardId: card.id,
          message: `Card "${card.front.slice(0, 50)}..." has no explanation`,
        });
        fixes.push({
          type: "generate_explanation",
          cardId: card.id,
          message: "Generate explanation for this card",
        });
      }

      if (card.front.length < 20) {
        issues.push({
          type: "vague_question",
          severity: "warning",
          cardId: card.id,
          message: `Card question is very short: "${card.front}"`,
        });
        fixes.push({
          type: "rewrite",
          cardId: card.id,
          message: "Rewrite card to be more specific",
        });
      }

      if (card.cardType === "mcq" && (!card.choices || JSON.parse(card.choices).length < 3)) {
        issues.push({
          type: "poor_mcq",
          severity: "warning",
          cardId: card.id,
          message: `MCQ has fewer than 3 choices`,
        });
        fixes.push({
          type: "improve_mcq",
          cardId: card.id,
          message: "Add more answer choices",
        });
      }
    }

    const totalIssues = issues.length;
    const maxIssues = deckCards.length * 2;
    const healthScore = Math.max(0, Math.round(100 - (totalIssues / maxIssues) * 100));

    trackUsage(db, userId, "deck-doctor", 0, Date.now() - startTime, true);
    return c.json({ healthScore, issues, fixes, totalCards: deckCards.length });
  } catch (err) {
    trackUsage(db, userId, "deck-doctor", 0, Date.now() - startTime, false);
    return serverError(c, "Deck doctor failed");
  }
});

// POST /api/agents/deck-doctor/fix
agentRoutes.post("/agents/deck-doctor/fix", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  const db = getDb(c);
  const body = await readJson(c);
  const { cardId, fixType, relatedCardId } = body as { cardId: number; fixType: string; relatedCardId?: number };
  const startTime = Date.now();

  try {
    const card = await db.query.cards.findFirst({ where: eq(cards.id, cardId) });
    if (!card) {
      return c.json({ error: { code: "NOT_FOUND", message: "Card not found" } }, 404);
    }

    let result: any = {};

    const ai = createAIService(c.env);

    if (fixType === "generate_explanation") {
      const explanation = await ai.explainCard(card.front, card.back, "full");
      await db.update(cards).set({ explanationFull: explanation, updatedAt: new Date() }).where(eq(cards.id, cardId));
      result = { explanation };
    } else if (fixType === "rewrite") {
      const improved = await ai.complete([
        { role: "system", content: "Rewrite this flashcard to be more specific and educational. Return JSON: {front, back}" },
        { role: "user", content: `Front: ${card.front}\nBack: ${card.back}` },
      ]);
      const jsonMatch = improved.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        await db.update(cards).set({ front: parsed.front, back: parsed.back, updatedAt: new Date() }).where(eq(cards.id, cardId));
        result = parsed;
      }
    } else if (fixType === "merge" && relatedCardId) {
      const related = await db.query.cards.findFirst({ where: eq(cards.id, relatedCardId) });
      if (related) {
        const merged = await ai.complete([
          { role: "system", content: "Merge these two flashcards into one comprehensive card. Return JSON: {front, back}" },
          { role: "user", content: `Card 1 - Front: ${related.front}\nBack: ${related.back}\n\nCard 2 - Front: ${card.front}\nBack: ${card.back}` },
        ]);
        const jsonMatch = merged.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          await db.update(cards).set({ front: parsed.front, back: parsed.back, updatedAt: new Date() }).where(eq(cards.id, relatedCardId));
          await db.delete(cards).where(eq(cards.id, cardId));
          result = { merged: true, ...parsed };
        }
      }
    } else if (fixType === "add_clinical_vignette") {
      const vignette = await ai.complete([
        { role: "system", content: "Rewrite this flashcard's front as a clinical vignette (patient scenario). Keep the same answer. Return JSON: {front, back}" },
        { role: "user", content: `Front: ${card.front}\nBack: ${card.back}` },
      ]);
      const jsonMatch = vignette.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        await db.update(cards).set({ front: parsed.front, back: parsed.back, updatedAt: new Date() }).where(eq(cards.id, cardId));
        result = parsed;
      }
    }

    trackUsage(db, userId, "deck-doctor-fix", 0, Date.now() - startTime, true);
    return c.json({ success: true, result });
  } catch (err) {
    trackUsage(db, userId, "deck-doctor-fix", 0, Date.now() - startTime, false);
    return serverError(c, "Fix failed");
  }
});

// POST /api/agents/generate-exam
agentRoutes.post("/agents/generate-exam", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  if (!aiAvailable(c)) {
    return c.json({ error: { code: "AI_UNAVAILABLE", message: "AI features require a configured API key (set OPENROUTER_API_KEY or another provider key in wrangler env)." } }, 503);
  }
  const db = getDb(c);
  const body = await readJson(c);
  const { deckIds, questionCount = 50, durationMinutes = 60, title } = body as {
    deckIds: number[]; questionCount?: number; durationMinutes?: number; title?: string;
  };
  const startTime = Date.now();

  if (!deckIds || deckIds.length === 0) {
    return c.json({ error: { code: "INVALID_INPUT", message: "deckIds are required" } }, 400);
  }

  try {
    const deckCards = await db.query.cards.findMany({
      where: inArray(cards.deckId, deckIds),
    });

    if (deckCards.length === 0) {
      return c.json({ error: { code: "NO_CARDS", message: "No cards found in selected decks" } }, 400);
    }

    const sampleCards = deckCards.sort(() => Math.random() - 0.5).slice(0, Math.min(30, deckCards.length));
    const cardContent = sampleCards.map((crd: any) => `Q: ${crd.front}\nA: ${crd.back}`).join("\n\n");

    const examTitle = title || `Mock Exam - ${new Date().toLocaleDateString()}`;

    const ai = createAIService(c.env);
    const response = await ai.complete([
      {
        role: "system",
        content: `You are a medical exam creator. Generate ${questionCount} high-quality MCQs based on the provided study material.
Rules:
- ${Math.round(questionCount * 0.4)} easy, ${Math.round(questionCount * 0.4)} medium, ${Math.round(questionCount * 0.2)} hard questions
- Each question must have a clinical vignette when appropriate
- 4 choices per question (A, B, C, D)
- Include detailed explanations
- Cover all topics proportionally

Return ONLY a valid JSON array:
[{"front": "Question text", "choices": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctIndex": 0, "explanation": "...", "difficulty": "easy|medium|hard", "topic": "topic name"}]`,
      },
      { role: "user", content: `Generate ${questionCount} exam questions based on:\n\n${cardContent}` },
    ]);

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Invalid exam generation response");
    }

    const questions = JSON.parse(jsonMatch[0]);
    await storeCachedResponse(db, "exam-simulator", `exam:${deckIds.sort().join(",")}:${questionCount}`, JSON.stringify(questions), "ai", 0.8);
    const [exam] = await db.insert(exams).values({
      userId,
      title: examTitle,
      deckIds: JSON.stringify(deckIds),
      questions: JSON.stringify(questions),
      totalQuestions: questions.length,
      durationMinutes,
    }).returning();

    trackUsage(db, userId, "exam-simulator", 0, Date.now() - startTime, true);
    return c.json({ exam: { ...exam, questions }, message: `Generated exam with ${questions.length} questions` });
  } catch (err) {
    trackUsage(db, userId, "exam-simulator", 0, Date.now() - startTime, false);
    return serverError(c, "Exam generation failed");
  }
});

// GET /api/agents/exams
agentRoutes.get("/agents/exams", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  try {
    const db = getDb(c);
    const examList = await db.query.exams.findMany({
      where: eq(exams.userId, userId),
      orderBy: [desc(exams.createdAt)],
    });
    return c.json({ exams: examList.map((e: any) => ({ ...e, questions: undefined })) });
  } catch (err) {
    return serverError(c, "Failed to list exams");
  }
});

// GET /api/agents/exams/:id
agentRoutes.get("/agents/exams/:id", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  try {
    const db = getDb(c);
    const exam = await db.query.exams.findFirst({
      where: and(eq(exams.id, parseInt(c.req.param("id") || "", 10)), eq(exams.userId, userId)),
    });
    if (!exam) {
      return c.json({ error: { code: "NOT_FOUND", message: "Exam not found" } }, 404);
    }
    return c.json({ exam });
  } catch (err) {
    return serverError(c, "Failed to get exam");
  }
});

// POST /api/agents/exams/:id/submit
agentRoutes.post("/agents/exams/:id/submit", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  const db = getDb(c);
  const examId = parseInt(c.req.param("id") || "", 10);
  const body = await readJson(c);
  const { answers } = body as { answers: Record<number, number> };
  const startTime = Date.now();

  try {
    const exam = await db.query.exams.findFirst({
      where: and(eq(exams.id, examId), eq(exams.userId, userId)),
    });
    if (!exam) {
      return c.json({ error: { code: "NOT_FOUND", message: "Exam not found" } }, 404);
    }

    const questions = JSON.parse(exam.questions);
    let correct = 0;
    const results: any[] = [];
    const topicScores: Record<string, { correct: number; total: number }> = {};

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const isCorrect = answers[i] === q.correctIndex;
      if (isCorrect) correct++;
      const topic = q.topic || "General";
      if (!topicScores[topic]) topicScores[topic] = { correct: 0, total: 0 };
      topicScores[topic].total++;
      if (isCorrect) topicScores[topic].correct++;

      results.push({
        questionIndex: i,
        userAnswer: answers[i],
        correctAnswer: q.correctIndex,
        isCorrect,
        explanation: q.explanation,
      });
    }

    const score = Math.round((correct / questions.length) * 100);
    const topicBreakdown = Object.entries(topicScores).map(([topic, s]) => ({
      topic,
      correct: s.correct,
      total: s.total,
      percentage: Math.round((s.correct / s.total) * 100),
    }));

    await db.update(exams).set({
      answers: JSON.stringify(answers),
      score,
      completedAt: new Date(),
    }).where(eq(exams.id, examId));

    trackUsage(db, userId, "exam-submit", 0, Date.now() - startTime, true);
    return c.json({
      score,
      correct,
      total: questions.length,
      results,
      topicBreakdown,
      weakTopics: topicBreakdown.filter((t: any) => t.percentage < 50).map((t: any) => t.topic),
    });
  } catch (err) {
    trackUsage(db, userId, "exam-submit", 0, Date.now() - startTime, false);
    return serverError(c, "Failed to submit exam");
  }
});

// POST /api/agents/summarize
agentRoutes.post("/agents/summarize", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  if (!aiAvailable(c)) {
    return c.json({ error: { code: "AI_UNAVAILABLE", message: "AI features require a configured API key (set OPENROUTER_API_KEY or another provider key in wrangler env)." } }, 503);
  }
  const db = getDb(c);
  const body = await readJson(c);
  const { content, fileName } = body as { content?: string; fileName?: string };
  const startTime = Date.now();

  if (!content) {
    return c.json({ error: { code: "INVALID_INPUT", message: "Content is required" } }, 400);
  }

  try {
    const cached = await getCachedResponse(db, "content-summarizer", content);
    if (cached) {
      trackUsage(db, userId, "content-summarizer", 0, Date.now() - startTime, true);
      return c.json({ summary: JSON.parse(cached.answer), source: "knowledge", cached: true });
    }

    const ai = createAIService(c.env);
    const response = await ai.complete([
      {
        role: "system",
        content: `You are a medical education content summarizer. Transform the provided content into structured study notes.
Return ONLY valid JSON:
{"title": "Topic title", "keyPoints": ["point 1", "point 2"], "definitions": [{"term": "...", "definition": "..."}], "clinicalPearls": ["pearl 1"], "suggestedCards": [{"front": "...", "back": "...", "tags": ["..."]}], "summary": "2-3 paragraph structured summary"}`,
      },
      { role: "user", content: `Summarize this content for medical students:\n\n${content.slice(0, 15000)}` },
    ]);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid summary response");
    }

    const summary = JSON.parse(jsonMatch[0]);
    await storeCachedResponse(db, "content-summarizer", content, JSON.stringify(summary), "ai", 0.8);
    trackUsage(db, userId, "content-summarizer", 0, Date.now() - startTime, true);
    return c.json({ summary });
  } catch (err) {
    trackUsage(db, userId, "content-summarizer", 0, Date.now() - startTime, false);
    return serverError(c, "Summarization failed");
  }
});

// POST /api/agents/mnemonics
agentRoutes.post("/agents/mnemonics", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  if (!aiAvailable(c)) {
    return c.json({ error: { code: "AI_UNAVAILABLE", message: "AI features require a configured API key (set OPENROUTER_API_KEY or another provider key in wrangler env)." } }, 503);
  }
  const db = getDb(c);
  const body = await readJson(c);
  const { concept, cardIds, deckId } = body as { concept?: string; cardIds?: number[]; deckId?: number };
  const startTime = Date.now();

  try {
    let content = concept || "";

    if (cardIds && cardIds.length > 0) {
      const selectedCards = await db.query.cards.findMany({ where: inArray(cards.id, cardIds) });
      content = selectedCards.map((crd: any) => `${crd.front}: ${crd.back}`).join("\n");
    } else if (deckId) {
      const deckCards = await db.query.cards.findMany({ where: eq(cards.deckId, deckId), limit: 20 });
      content = deckCards.map((crd: any) => `${crd.front}: ${crd.back}`).join("\n");
    }

    if (!content) {
      return c.json({ error: { code: "INVALID_INPUT", message: "Concept, cardIds, or deckId is required" } }, 400);
    }

    const ai = createAIService(c.env);
    const response = await ai.complete([
      {
        role: "system",
        content: `You are a medical mnemonic expert. Generate creative, memorable mnemonics for the provided medical concepts.
Return ONLY valid JSON:
{"mnemonics": [{"type": "acronym|visual|story|rhyme", "title": "...", "content": "...", "explanation": "..."}]}`,
      },
      { role: "user", content: `Generate mnemonics for:\n\n${content.slice(0, 8000)}` },
    ]);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid mnemonic response");
    }

    const result = JSON.parse(jsonMatch[0]);
    await storeCachedResponse(db, "mnemonic-generator", concept || content, JSON.stringify(result), "ai", 0.8);
    trackUsage(db, userId, "mnemonic-generator", 0, Date.now() - startTime, true);
    return c.json(result);
  } catch (err) {
    trackUsage(db, userId, "mnemonic-generator", 0, Date.now() - startTime, false);
    return serverError(c, "Mnemonic generation failed");
  }
});

// POST /api/agents/mnemonics/save
agentRoutes.post("/agents/mnemonics/save", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  try {
    const db = getDb(c);
    const body = await readJson(c);
    const { cardId, mnemonic } = body as { cardId: number; mnemonic: string };
    await db.update(cards).set({ explanationMnemonic: mnemonic, updatedAt: new Date() }).where(eq(cards.id, cardId));
    return c.json({ success: true });
  } catch (err) {
    return serverError(c, "Failed to save mnemonic");
  }
});

// GET /api/agents/coach
agentRoutes.get("/agents/coach", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  const db = getDb(c);
  const startTime = Date.now();

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const sessions = await db.query.studySessions.findMany({
      where: and(eq(studySessions.userId, userId), gte(studySessions.startedAt, thirtyDaysAgo)),
      orderBy: [desc(studySessions.startedAt)],
    });

    const allDecks = await db.query.decks.findMany({ where: eq(decks.userId, userId) });
    const allCards = await db.query.cards.findMany();
    const progressEntries = await db.query.cardProgress.findMany({ where: eq(cardProgress.userId, userId) });

    const totalCardsStudied = sessions.reduce((sum: number, s: any) => sum + s.cardsStudied, 0);
    const totalKnown = sessions.reduce((sum: number, s: any) => sum + (s.knownCount || 0), 0);
    const totalUnknown = sessions.reduce((sum: number, s: any) => sum + (s.unknownCount || 0), 0);
    const overallAccuracy = totalCardsStudied > 0 ? Math.round((totalKnown / totalCardsStudied) * 100) : 0;

    const dayOfWeekCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
    const hourCounts: number[] = new Array(24).fill(0);
    for (const s of sessions) {
      const d = new Date(s.startedAt);
      dayOfWeekCounts[d.getDay()]++;
      hourCounts[d.getHours()]++;
    }
    const bestDay = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
    const bestHour = hourCounts.indexOf(Math.max(...hourCounts));

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const tagPerformance: Record<string, { known: number; unknown: number }> = {};
    for (const p of progressEntries) {
      const card = allCards.find((crd: any) => crd.id === p.cardId);
      if (!card) continue;
      const tags = parseTags(card.tags);
      for (const tag of tags) {
        if (!tagPerformance[tag]) tagPerformance[tag] = { known: 0, unknown: 0 };
        tagPerformance[tag].known += p.knownCount;
        tagPerformance[tag].unknown += p.unknownCount;
      }
    }

    const weakTopics = Object.entries(tagPerformance)
      .filter(([, v]) => {
        const total = v.known + v.unknown;
        return total > 2 && v.known / total < 0.6;
      })
      .sort((a: any, b: any) => {
        const ratioA = a[1].known / (a[1].known + a[1].unknown);
        const ratioB = b[1].known / (b[1].known + b[1].unknown);
        return ratioA - ratioB;
      })
      .slice(0, 5)
      .map(([tag]) => tag);

    const strongTopics = Object.entries(tagPerformance)
      .filter(([, v]) => {
        const total = v.known + v.unknown;
        return total > 2 && v.known / total >= 0.8;
      })
      .sort((a: any, b: any) => {
        const ratioB = b[1].known / (b[1].known + b[1].unknown);
        const ratioA = a[1].known / (a[1].known + a[1].unknown);
        return ratioB - ratioA;
      })
      .slice(0, 3)
      .map(([tag]) => tag);

    const lastSession = sessions[0];
    const daysSinceLastSession = lastSession ? Math.floor((Date.now() - new Date(lastSession.startedAt).getTime()) / 86400000) : 99;

    const recommendations: string[] = [];
    if (daysSinceLastSession > 2) recommendations.push(`You haven't studied in ${daysSinceLastSession} days. Your streak is at risk!`);
    if (weakTopics.length > 0) recommendations.push(`Focus on ${weakTopics.slice(0, 3).join(", ")} — these are your weakest areas.`);
    if (bestHour >= 0) recommendations.push(`You study most effectively around ${bestHour > 12 ? bestHour - 12 : bestHour}:00 ${bestHour >= 12 ? "PM" : "AM"}.`);
    if (overallAccuracy < 60) recommendations.push("Your overall accuracy is below 60%. Consider reviewing fundamentals before adding new cards.");
    if (sessions.length < 7) recommendations.push("Try to study daily — consistency is key for long-term retention.");
    if (strongTopics.length > 0) recommendations.push(`Great progress in ${strongTopics.join(", ")}! Keep it up.`);

    const weeklyPlan = [
      { day: dayNames[(bestDay + 1) % 7], focus: weakTopics[0] || "General review", duration: 45 },
      { day: dayNames[(bestDay + 2) % 7], focus: weakTopics[1] || "New cards", duration: 30 },
      { day: dayNames[(bestDay + 3) % 7], focus: "Mixed review", duration: 40 },
      { day: dayNames[(bestDay + 4) % 7], focus: weakTopics[2] || "Practice questions", duration: 35 },
      { day: dayNames[(bestDay + 5) % 7], focus: "Weak areas", duration: 50 },
    ];

    trackUsage(db, userId, "progress-coach", 0, Date.now() - startTime, true);
    return c.json({
      stats: {
        totalSessions: sessions.length,
        totalCardsStudied,
        overallAccuracy,
        daysSinceLastSession,
        totalDecks: allDecks.length,
        totalCards: allCards.length,
      },
      patterns: {
        bestDay: dayNames[bestDay],
        bestHour: `${bestHour > 12 ? bestHour - 12 : bestHour}:00 ${bestHour >= 12 ? "PM" : "AM"}`,
        averageSessionLength: sessions.length > 0 ? Math.round(sessions.reduce((s: number, x: any) => s + (x.durationMinutes || 0), 0) / sessions.length) : 0,
      },
      weakTopics,
      strongTopics,
      recommendations,
      weeklyPlan,
    });
  } catch (err) {
    trackUsage(db, userId, "progress-coach", 0, Date.now() - startTime, false);
    return serverError(c, "Coach failed");
  }
});

// POST /api/agents/image-analyze — STUBBED: multimodal vision is not supported by createAIService.
agentRoutes.post("/agents/image-analyze", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  return c.json({
    error: { code: "NOT_SUPPORTED", message: "Image analysis (multimodal vision) is not available on this deployment" },
  }, 501);
});

// POST /api/agents/voice-check
agentRoutes.post("/agents/voice-check", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  if (!aiAvailable(c)) {
    return c.json({ error: { code: "AI_UNAVAILABLE", message: "AI features require a configured API key (set OPENROUTER_API_KEY or another provider key in wrangler env)." } }, 503);
  }
  const db = getDb(c);
  const body = await readJson(c);
  const { cardFront, cardBack, spokenAnswer } = body as { cardFront: string; cardBack: string; spokenAnswer: string };
  const startTime = Date.now();

  if (!spokenAnswer || !cardBack) {
    return c.json({ error: { code: "INVALID_INPUT", message: "spokenAnswer and cardBack are required" } }, 400);
  }

  try {
    const cacheKey = `voice:${cardFront}:${spokenAnswer}`;
    const cached = await getCachedResponse(db, "voice-tutor", cacheKey);
    if (cached) {
      trackUsage(db, userId, "voice-tutor", 0, Date.now() - startTime, true);
      return c.json(JSON.parse(cached.answer));
    }

    const ai = createAIService(c.env);
    const response = await ai.complete([
      {
        role: "system",
        content: `You are a medical study tutor. Compare the student's spoken answer to the correct answer. Be lenient — accept semantically correct answers even if wording differs.
Return ONLY valid JSON:
{"correct": true|false, "feedback": "...", "keyPoints": ["..."], "score": 0-100}`,
      },
      {
        role: "user",
        content: `Question: ${cardFront}\nCorrect Answer: ${cardBack}\nStudent's Answer: ${spokenAnswer}`,
      },
    ]);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid voice check response");
    }

    const result = JSON.parse(jsonMatch[0]);
    await storeCachedResponse(db, "voice-tutor", cacheKey, JSON.stringify(result), "ai", 0.8);
    trackUsage(db, userId, "voice-tutor", 0, Date.now() - startTime, true);
    return c.json(result);
  } catch (err) {
    trackUsage(db, userId, "voice-tutor", 0, Date.now() - startTime, false);
    return serverError(c, "Voice check failed");
  }
});

// POST /api/agents/group-study/create
agentRoutes.post("/agents/group-study/create", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  try {
    const db = getDb(c);
    const body = await readJson(c);
    const { deckIds } = body as { deckIds: number[] };

    const roomId = crypto.randomUUID();
    const [room] = await db.insert(groupStudyRooms).values({
      id: roomId,
      hostUserId: userId,
      deckIds: JSON.stringify(deckIds || []),
      participants: JSON.stringify([{ userId, joinedAt: new Date().toISOString() }]),
    }).returning();

    return c.json({ room });
  } catch (err) {
    return serverError(c, "Failed to create room");
  }
});

// POST /api/agents/group-study/join
agentRoutes.post("/agents/group-study/join", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  try {
    const db = getDb(c);
    const body = await readJson(c);
    const { roomId } = body as { roomId: string };

    const room = await db.query.groupStudyRooms.findFirst({ where: eq(groupStudyRooms.id, roomId) });
    if (!room) {
      return c.json({ error: { code: "NOT_FOUND", message: "Room not found" } }, 404);
    }

    const participants = JSON.parse(room.participants);
    if (!participants.find((p: any) => p.userId === userId)) {
      participants.push({ userId, joinedAt: new Date().toISOString() });
      await db.update(groupStudyRooms).set({ participants: JSON.stringify(participants), updatedAt: new Date() }).where(eq(groupStudyRooms.id, roomId));
    }

    return c.json({ room: { ...room, participants } });
  } catch (err) {
    return serverError(c, "Failed to join room");
  }
});

// POST /api/agents/group-study/question
agentRoutes.post("/agents/group-study/question", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  const db = getDb(c);
  const body = await readJson(c);
  const { roomId } = body as { roomId: string };
  const startTime = Date.now();

  try {
    const room = await db.query.groupStudyRooms.findFirst({ where: eq(groupStudyRooms.id, roomId) });
    if (!room) {
      return c.json({ error: { code: "NOT_FOUND", message: "Room not found" } }, 404);
    }

    const deckIds = JSON.parse(room.deckIds);
    if (deckIds.length === 0) {
      return c.json({ error: { code: "NO_DECKS", message: "No decks selected for this room" } }, 400);
    }

    const roomCards = await db.query.cards.findMany({ where: inArray(cards.deckId, deckIds), limit: 20 });
    const cardContent = roomCards.map((crd: any) => `Q: ${crd.front}\nA: ${crd.back}`).join("\n\n");

    const ai = createAIService(c.env);
    const response = await ai.complete([
      {
        role: "system",
        content: `Generate a single high-quality medical MCQ for group study. Return ONLY valid JSON:
{"front": "Question text with clinical vignette", "choices": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctIndex": 0, "explanation": "Detailed explanation", "topic": "topic name"}`,
      },
      { role: "user", content: `Generate a group study question based on:\n\n${cardContent}` },
    ]);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid question response");
    }

    const question = JSON.parse(jsonMatch[0]);
    await storeCachedResponse(db, "collaborative-study", `group:${roomId}:${cardContent.slice(0, 100)}`, JSON.stringify(question), "ai", 0.8);
    const questions = JSON.parse(room.questions);
    questions.push(question);
    await db.update(groupStudyRooms).set({ questions: JSON.stringify(questions), currentQuestionIndex: questions.length - 1, updatedAt: new Date() }).where(eq(groupStudyRooms.id, roomId));

    trackUsage(db, userId, "group-study", 0, Date.now() - startTime, true);
    return c.json({ question, questionIndex: questions.length - 1 });
  } catch (err) {
    trackUsage(db, userId, "group-study", 0, Date.now() - startTime, false);
    return serverError(c, "Failed to generate question");
  }
});

// GET /api/agents/group-study/:roomId
agentRoutes.get("/agents/group-study/:roomId", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  try {
    const db = getDb(c);
    const room = await db.query.groupStudyRooms.findFirst({ where: eq(groupStudyRooms.id, c.req.param("roomId")) });
    if (!room) {
      return c.json({ error: { code: "NOT_FOUND", message: "Room not found" } }, 404);
    }
    return c.json({ room });
  } catch (err) {
    return serverError(c, "Failed to get room");
  }
});

// GET /api/agents/usage
agentRoutes.get("/agents/usage", async (c) => {
  const userId = getUserId(c);
  if (!userId) return unauthorized(c);
  try {
    const db = getDb(c);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const usage = await db.query.agentUsage.findMany({
      where: and(eq(agentUsage.userId, userId), gte(agentUsage.createdAt, thirtyDaysAgo)),
      orderBy: [desc(agentUsage.createdAt)],
    });

    const byAgent: Record<string, { calls: number; tokens: number; successRate: number }> = {};
    for (const u of usage) {
      if (!byAgent[u.agentId]) byAgent[u.agentId] = { calls: 0, tokens: 0, successRate: 0 };
      byAgent[u.agentId].calls++;
      byAgent[u.agentId].tokens += u.tokensUsed;
      byAgent[u.agentId].successRate += u.success ? 1 : 0;
    }
    for (const agent of Object.keys(byAgent)) {
      byAgent[agent].successRate = Math.round((byAgent[agent].successRate / byAgent[agent].calls) * 100);
    }

    return c.json({ usage, byAgent, totalCalls: usage.length });
  } catch (err) {
    return serverError(c, "Failed to get usage");
  }
});
