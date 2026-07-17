import { Hono } from "hono";
import { eq, desc, asc, sql } from "drizzle-orm";
import type { AppEnv } from "../types";
import { supportKnowledge, supportConversations, supportMessages } from "../db/index";
import { getDb, getUserId, readJson, serverError } from "../lib/helpers";
import { createAIService } from "../lib/ai";

export const supportRoutes = new Hono<AppEnv>();

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return raw.split(",").map((t) => t.trim()).filter(Boolean);
  }
}

async function getPopularQuestions(db: any, limit = 5) {
  try {
    return await db.select({ id: supportKnowledge.id, question: supportKnowledge.question, category: supportKnowledge.category })
      .from(supportKnowledge)
      .where(eq(supportKnowledge.isActive, true))
      .orderBy(desc(supportKnowledge.views))
      .limit(limit);
  } catch {
    return [];
  }
}

// GET /api/support/search
supportRoutes.get("/support/search", async (c) => {
  try {
    const db = getDb(c);
    const q = (c.req.query("q") || "").trim();
    if (!q || q.length < 2) {
      const popular = await getPopularQuestions(db);
      return c.json({ results: [], suggestions: popular });
    }

    const keywords = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const entries = await db.select().from(supportKnowledge).where(eq(supportKnowledge.isActive, true));

    const scored = entries.map((entry: any) => {
      let score = 0;
      let entryKeywords: string[] = [];
      try { entryKeywords = JSON.parse(entry.keywords || "[]"); } catch { entryKeywords = []; }
      const questionLower = (entry.question || "").toLowerCase();

      for (const kw of keywords) {
        if (questionLower.includes(kw)) score += 10;
        for (const ekw of entryKeywords) {
          if (ekw.includes(kw) || kw.includes(ekw)) score += 5;
        }
      }
      if (entry.isPinned) score += 2;
      const total = (entry.helpfulCount || 0) + (entry.notHelpfulCount || 0);
      if (total > 0) {
        score += ((entry.helpfulCount || 0) / total) * 3;
      }
      return { entry, score };
    });

    const results = scored
      .filter((s: any) => s.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5)
      .map((s: any) => ({
        id: s.entry.id,
        question: s.entry.question,
        answer: s.entry.answer,
        category: s.entry.category,
        score: s.score,
      }));

    if (results.length > 0) {
      try {
        await db.update(supportKnowledge).set({ views: sql`${supportKnowledge.views} + 1` }).where(eq(supportKnowledge.id, results[0].id));
      } catch { /* ignore */ }
    }

    return c.json({ results, query: q });
  } catch (err) {
    return serverError(c, "Search failed");
  }
});

// POST /api/support/ask
supportRoutes.post("/support/ask", async (c) => {
  const db = getDb(c);
  const body = await readJson(c);
  const question = body.question as string;
  const _userId = getUserId(c);

  if (!question || typeof question !== "string" || question.trim().length < 3) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Question is required (min 3 chars)" } }, 400);
  }

  let bestMatch: { id: number; question: string; answer: string; category: string } | null = null;

  try {
    const keywords = question.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const entries = await db.select().from(supportKnowledge).where(eq(supportKnowledge.isActive, true));

    let bestScore = 0;

    for (const entry of entries as any[]) {
      let entryKeywords: string[] = [];
      try { entryKeywords = JSON.parse(entry.keywords || "[]"); } catch { entryKeywords = []; }
      const questionLower = (entry.question || "").toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (questionLower.includes(kw)) score += 10;
        for (const ekw of entryKeywords) {
          if (ekw.includes(kw) || kw.includes(ekw)) score += 5;
        }
      }
      if (entry.isPinned) score += 2;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { id: entry.id, question: entry.question, answer: entry.answer, category: entry.category };
      }
    }

    if (bestMatch && bestScore > 15) {
      try {
        await db.update(supportKnowledge).set({ views: sql`${supportKnowledge.views} + 1` }).where(eq(supportKnowledge.id, bestMatch.id));
      } catch { /* ignore */ }

      return c.json({
        answer: bestMatch.answer,
        source: "knowledge",
        knowledgeId: bestMatch.id,
        question: bestMatch.question,
        category: bestMatch.category,
        confidence: Math.min(bestScore / 30, 1),
      });
    }

    const systemPrompt = `You are a technical support agent for MedNexus, a medical flashcard study app.

- Keep responses under 300 words. Use markdown formatting.`;

    const knowledgeContext = bestMatch
      ? `\n\nRelated knowledge base entry: Q: ${bestMatch.question} A: ${bestMatch.answer.substring(0, 200)}`
      : "";

    const ai = createAIService(c.env);
    const aiAnswer = await ai.complete([
      { role: "system", content: systemPrompt + knowledgeContext },
      { role: "user", content: question },
    ], { maxTokens: 500, temperature: 0.3 });

    return c.json({
      answer: aiAnswer,
      source: "ai",
      knowledgeId: null,
      question: question,
      category: "general",
      confidence: 0.5,
    });
  } catch (err) {
    const fallbackAnswer = bestMatch
      ? `I found a related support answer, but AI generation is temporarily unavailable.\n\n${bestMatch.answer}`
      : `I couldn't generate a live AI answer right now. Please try these steps first:\n\n1. Refresh the page and try again.\n2. Check your internet connection.\n3. Clear browser cache if the issue continues.\n4. Use the Help Center or feedback form for account-specific issues.`;

    return c.json({
      answer: fallbackAnswer,
      source: "knowledge",
      knowledgeId: bestMatch?.id ?? null,
      question,
      category: "general",
      confidence: bestMatch ? 0.35 : 0.2,
    });
  }
});

// POST /api/support/rate
supportRoutes.post("/support/rate", async (c) => {
  try {
    const db = getDb(c);
    const body = await readJson(c);
    const { knowledgeId, helpful } = body as { knowledgeId?: number; helpful?: boolean };
    if (!knowledgeId) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "knowledgeId required" } }, 400);
    }
    const field = helpful ? "helpfulCount" : "notHelpfulCount";
    await db.update(supportKnowledge).set({ [field]: sql`${supportKnowledge[field as keyof typeof supportKnowledge]} + 1` } as any)
      .where(eq(supportKnowledge.id, Number(knowledgeId)));
    return c.json({ success: true });
  } catch (err) {
    return serverError(c);
  }
});

// GET /api/support/categories
supportRoutes.get("/support/categories", async (c) => {
  try {
    const db = getDb(c);
    const rows = await db.selectDistinct({ category: supportKnowledge.category })
      .from(supportKnowledge)
      .where(eq(supportKnowledge.isActive, true))
      .orderBy(supportKnowledge.category);
    const categories = (rows as any[]).map((r) => r.category);
    const [totalRow] = await db.select({ cnt: sql<number>`count(*)` }).from(supportKnowledge).where(eq(supportKnowledge.isActive, true));
    const total = totalRow?.cnt || 0;
    return c.json({ categories, total });
  } catch (err) {
    return serverError(c);
  }
});

// GET /api/support/popular
supportRoutes.get("/support/popular", async (c) => {
  try {
    const db = getDb(c);
    const entries = await db.select({ id: supportKnowledge.id, question: supportKnowledge.question, category: supportKnowledge.category })
      .from(supportKnowledge)
      .where(eq(supportKnowledge.isActive, true))
      .orderBy(desc(supportKnowledge.views))
      .limit(8);
    return c.json({ questions: entries });
  } catch (err) {
    return serverError(c);
  }
});

// POST /api/support/chat — streaming AI support chat with conversation persistence
supportRoutes.post("/support/chat", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const body = await readJson(c);
  const { message, sessionId } = body as { message?: string; sessionId?: string };

  if (!message || typeof message !== "string" || message.trim().length < 2) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Message is required" } }, 400);
  }

  try {
    let convId: number;
    let sid = sessionId || crypto.randomUUID();

    const existing = sessionId
      ? await db.query.supportConversations.findFirst({ where: eq(supportConversations.sessionId, sid) })
      : null;

    if (existing) {
      convId = existing.id;
    } else {
      const [conv] = await db.insert(supportConversations).values({
        userId: userId || null,
        sessionId: sid,
        status: "active",
      }).returning();
      convId = conv.id;
    }

    await db.insert(supportMessages).values({
      conversationId: convId,
      role: "user",
      content: message,
    });

    const history = await db.query.supportMessages.findMany({
      where: eq(supportMessages.conversationId, convId),
      orderBy: [asc(supportMessages.createdAt)],
      limit: 10,
    });

    const systemPrompt = `You are a technical support agent for MedNexus, a medical flashcard study app.

- Keep responses under 300 words. Use markdown formatting.`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.slice(-6).map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const ai = createAIService(c.env);
    const stream = ai.streamComplete(messages, { maxTokens: 500, temperature: 0.3 });

    const encoder = new TextEncoder();
    const s = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sessionId: sid })}\n\n`));
          let fullAnswer = "";
          for await (const chunk of stream) {
            fullAnswer += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }
          await db.insert(supportMessages).values({
            conversationId: convId,
            role: "assistant",
            content: fullAnswer,
            source: "ai",
          });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Chat failed" })}\n\n`));
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
    return serverError(c, "Support chat failed");
  }
});

// GET /api/support/history
supportRoutes.get("/support/history", async (c) => {
  try {
    const db = getDb(c);
    const sessionId = c.req.query("sessionId");
    if (!sessionId) {
      return c.json({ messages: [] });
    }

    const conv = await db.query.supportConversations.findFirst({
      where: eq(supportConversations.sessionId, sessionId),
    });

    if (!conv) {
      return c.json({ messages: [] });
    }

    const msgs = await db.query.supportMessages.findMany({
      where: eq(supportMessages.conversationId, conv.id),
      orderBy: [asc(supportMessages.createdAt)],
      limit: 50,
    });

    return c.json({
      messages: msgs.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        source: m.source,
        createdAt: m.createdAt,
      })),
      sessionId: conv.id,
    });
  } catch (err) {
    return serverError(c);
  }
});

// POST /api/support/conversations/:id/rate
supportRoutes.post("/support/conversations/:id/rate", async (c) => {
  try {
    const db = getDb(c);
    const body = await readJson(c);
    const { rating, feedback } = body as { rating?: number; feedback?: string };
    await db.update(supportConversations).set({
      rating: rating || null,
      feedback: feedback || null,
      updatedAt: new Date(),
    }).where(eq(supportConversations.id, parseInt(c.req.param("id") || "", 10)));
    return c.json({ success: true });
  } catch (err) {
    return serverError(c);
  }
});
