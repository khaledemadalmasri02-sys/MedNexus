import { Router, Request, Response } from "express";
import { getConfig } from "../config.js";
import { db, chatMessages, agentUsage, decks, cards, cardProgress, studySessions, userSettings, exams, groupStudyRooms } from "../db/index.js";
import { eq, and, gte, lte, inArray, desc, sql } from "drizzle-orm";
import { aiService } from "../lib/ai.js";
import { logger } from "../lib/logger.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadImage } from "../middleware/upload.js";
import crypto from "crypto";
import { getCachedResponse, storeCachedResponse, searchKnowledge } from "../lib/agent-cache.js";

const router = Router();

function getUserId(req: Request): string {
  return req.user!.id;
}

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return raw.split(",").map(t => t.trim()).filter(Boolean);
  }
}

function trackUsage(userId: string, agentId: string, tokensUsed: number, durationMs: number, success: boolean) {
  db.insert(agentUsage).values({
    userId,
    agentId,
    tokensUsed,
    durationMs,
    success,
    createdAt: new Date(),
  }).catch(() => {});
}

function isEnabled(req: Request, setting: string): boolean {
  return (req.user as any)?.[setting] !== false;
}

router.post("/chat", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { message, deckId, mode } = req.body as { message: string; deckId?: number; mode?: string };
  const startTime = Date.now();

  if (!message) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "Message is required" } });
    return;
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
      deckContext += `\n\nRecent study activity: ${recentSessions.map(s => `${s.cardsStudied} cards studied`).join(", ")}`;
    }

    const recentCards = await db.query.cards.findMany({
      where: deckId ? eq(cards.deckId, deckId) : undefined,
      limit: 5,
      orderBy: [desc(cards.updatedAt)],
    });

    let cardContext = "";
    if (recentCards.length > 0) {
      cardContext = "\n\nRelevant cards from user's collection:\n" + recentCards.map(c => `Q: ${c.front}\nA: ${c.back}`).join("\n\n");
    }

    await db.insert(chatMessages).values({ userId, role: "user", content: message, deckContext: deckId ? String(deckId) : null, createdAt: new Date() });
    logger.debug({ msg: "chat msg inserted" });

    const cached = await getCachedResponse("study-buddy", message);
    logger.debug({ msg: "cache checked", cached: !!cached });
    if (cached) {
      await db.insert(chatMessages).values({ userId, role: "assistant", content: cached.answer, deckContext: deckId ? String(deckId) : null, createdAt: new Date() });
      trackUsage(userId, "study-buddy", 0, Date.now() - startTime, true);
      res.json({ answer: cached.answer, source: cached.source, cached: true });
      return;
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

    const maxTokens = chatMode === "brief" ? 384 : 1024;

    const knowledgeEntries = await searchKnowledge("study-buddy", message, 3);
    const knowledgeContext = knowledgeEntries.length > 0
      ? "\n\nRelevant reference material:\n" + knowledgeEntries.map(e => `Q: ${e.question}\nA: ${e.answer}`).join("\n\n")
      : "";

    const stream = aiService.streamComplete([
      { role: "system", content: systemPrompt + knowledgeContext },
      { role: "user", content: message },
    ], { model: getConfig().STUDY_BUDDY_MODEL, maxTokens: maxTokens, temperature: 0.7 });

    let fullResponse = "";
    try {
      for await (const chunk of stream) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
      res.write(`data: [DONE]\n\n`);
      await storeCachedResponse("study-buddy", message, fullResponse, "ai", 0.8);
      await db.insert(chatMessages).values({ userId, role: "assistant", content: fullResponse, deckContext: deckId ? String(deckId) : null, createdAt: new Date() });
      trackUsage(userId, "study-buddy", 0, Date.now() - startTime, true);
    } catch (streamErr) {
      logger.error({ err: streamErr }, "Chat stream error");
      trackUsage(userId, "study-buddy", 0, Date.now() - startTime, false);
      res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
    }
    res.end();
  } catch (err) {
    logger.error({ err }, "Chat endpoint error");
    trackUsage(userId, "study-buddy", 0, Date.now() - startTime, false);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Chat failed" } });
  }
});

router.get("/chat/history", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const before = req.query.before ? new Date(req.query.before as string) : new Date();

    const messages = await db.query.chatMessages.findMany({
      where: and(eq(chatMessages.userId, userId), lte(chatMessages.createdAt, before)),
      orderBy: [desc(chatMessages.createdAt)],
      limit,
    });

    res.json({ messages: messages.reverse() });
  } catch (err) {
    logger.error({ err }, "Chat history error");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get chat history" } });
  }
});

router.delete("/chat/history", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Chat clear error");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to clear chat" } });
  }
});

router.post("/smart-review", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { deckId, count = 30 } = req.body as { deckId?: number; count?: number };
  const startTime = Date.now();

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const sessions = await db.query.studySessions.findMany({
      where: and(eq(studySessions.userId, userId), gte(studySessions.startedAt, thirtyDaysAgo)),
    });

    const deckFilter = deckId ? eq(cards.deckId, deckId) : undefined;
    const allCards = await db.query.cards.findMany({ where: deckFilter });

    const cardProgressMap = new Map<number, { known: number; unknown: number; total: number }>();
    for (const card of allCards) {
      const progress = await db.query.cardProgress.findFirst({
        where: and(eq(cardProgress.cardId, card.id), eq(cardProgress.userId, userId)),
      });
      if (progress) {
        cardProgressMap.set(card.id, {
          known: progress.knownCount,
          unknown: progress.unknownCount,
          total: progress.totalStudiedCount,
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
        const daysSinceStudy = (Date.now() - (progress as any).lastStudiedAt) / 86400000;
        if (daysSinceStudy > 7) overdueCards.push({ ...card, reason: `Not studied recently`, score: 0.5 });
      }
    }

    const prioritized = [
      ...weakCards.sort((a, b) => a.score - b.score),
      ...atRiskCards.filter(c => !weakCards.find(w => w.id === c.id)),
      ...overdueCards.filter(c => !weakCards.find(w => w.id === c.id) && !atRiskCards.find(a => a.id === c.id)),
    ].slice(0, count);

    if (prioritized.length < count) {
      const existingIds = new Set(prioritized.map(c => c.id));
      const remaining = allCards.filter(c => !existingIds.has(c.id)).slice(0, count - prioritized.length);
      prioritized.push(...remaining.map(c => ({ ...c, reason: "New card", score: 0.5 })));
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
      .sort((a, b) => b[1].weak - a[1].weak)
      .slice(0, 5)
      .map(([tag]) => tag);

    const reasoning = `Analyzed ${sessions.length} study sessions over the last 30 days. Found ${weakCards.length} weak cards (below 50% accuracy), ${overdueCards.length} overdue cards, and ${atRiskCards.length} at-risk cards. Generated a targeted review of ${prioritized.length} cards.`;

    trackUsage(userId, "smart-review", 0, Date.now() - startTime, true);
    res.json({
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
    logger.error({ err }, "Smart review error");
    trackUsage(userId, "smart-review", 0, Date.now() - startTime, false);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Smart review failed" } });
  }
});

router.post("/deck-doctor", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { deckId } = req.body as { deckId: number };
  const startTime = Date.now();

  if (!deckId) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "deckId is required" } });
    return;
  }

  try {
    const deckCards = await db.query.cards.findMany({ where: eq(cards.deckId, deckId) });
    if (deckCards.length === 0) {
      res.json({ healthScore: 100, issues: [], fixes: [], message: "Deck is empty" });
      return;
    }

    const issues: any[] = [];
    const fixes: any[] = [];

    const fronts = deckCards.map(c => c.front.toLowerCase().trim());
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

    trackUsage(userId, "deck-doctor", 0, Date.now() - startTime, true);
    res.json({ healthScore, issues, fixes, totalCards: deckCards.length });
  } catch (err) {
    logger.error({ err }, "Deck doctor error");
    trackUsage(userId, "deck-doctor", 0, Date.now() - startTime, false);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Deck doctor failed" } });
  }
});

router.post("/deck-doctor/fix", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { cardId, fixType, relatedCardId } = req.body as { cardId: number; fixType: string; relatedCardId?: number };
  const startTime = Date.now();

  try {
    const card = await db.query.cards.findFirst({ where: eq(cards.id, cardId) });
    if (!card) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Card not found" } });
      return;
    }

    let result: any = {};

    if (fixType === "generate_explanation") {
      const explanation = await aiService.explainCard(card.front, card.back, "full");
      await db.update(cards).set({ explanationFull: explanation, updatedAt: new Date() }).where(eq(cards.id, cardId));
      result = { explanation };
    } else if (fixType === "rewrite") {
      const improved = await aiService.complete([
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
        const merged = await aiService.complete([
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
      const vignette = await aiService.complete([
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

    trackUsage(userId, "deck-doctor-fix", 0, Date.now() - startTime, true);
    res.json({ success: true, result });
  } catch (err) {
    logger.error({ err }, "Deck doctor fix error");
    trackUsage(userId, "deck-doctor-fix", 0, Date.now() - startTime, false);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Fix failed" } });
  }
});

router.post("/generate-exam", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { deckIds, questionCount = 50, durationMinutes = 60, title } = req.body as {
    deckIds: number[]; questionCount?: number; durationMinutes?: number; title?: string;
  };
  const startTime = Date.now();

  if (!deckIds || deckIds.length === 0) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "deckIds are required" } });
    return;
  }

  try {
    const deckCards = await db.query.cards.findMany({
      where: inArray(cards.deckId, deckIds),
    });

    if (deckCards.length === 0) {
      res.status(400).json({ error: { code: "NO_CARDS", message: "No cards found in selected decks" } });
      return;
    }

    const sampleCards = deckCards.sort(() => Math.random() - 0.5).slice(0, Math.min(30, deckCards.length));
    const cardContent = sampleCards.map(c => `Q: ${c.front}\nA: ${c.back}`).join("\n\n");

    const examTitle = title || `Mock Exam - ${new Date().toLocaleDateString()}`;

    const response = await aiService.complete([
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
    await storeCachedResponse("exam-simulator", `exam:${deckIds.sort().join(",")}:${questionCount}`, JSON.stringify(questions), "ai", 0.8);
    const [exam] = await db.insert(exams).values({
      userId,
      title: examTitle,
      deckIds: JSON.stringify(deckIds),
      questions: JSON.stringify(questions),
      totalQuestions: questions.length,
      durationMinutes,
      createdAt: new Date(),
    }).returning();

    trackUsage(userId, "exam-simulator", 0, Date.now() - startTime, true);
    res.json({ exam: { ...exam, questions }, message: `Generated exam with ${questions.length} questions` });
  } catch (err) {
    logger.error({ err }, "Exam generation error");
    trackUsage(userId, "exam-simulator", 0, Date.now() - startTime, false);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Exam generation failed" } });
  }
});

router.get("/exams", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const examList = await db.query.exams.findMany({
      where: eq(exams.userId, userId),
      orderBy: [desc(exams.createdAt)],
    });
    res.json({ exams: examList.map(e => ({ ...e, questions: undefined })) });
  } catch (err) {
    logger.error({ err }, "List exams error");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list exams" } });
  }
});

router.get("/exams/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const exam = await db.query.exams.findFirst({
      where: and(eq(exams.id, parseInt(req.params.id)), eq(exams.userId, userId)),
    });
    if (!exam) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Exam not found" } });
      return;
    }
    res.json({ exam });
  } catch (err) {
    logger.error({ err }, "Get exam error");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get exam" } });
  }
});

router.post("/exams/:id/submit", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const examId = parseInt(req.params.id);
  const { answers } = req.body as { answers: Record<number, number> };
  const startTime = Date.now();

  try {
    const exam = await db.query.exams.findFirst({
      where: and(eq(exams.id, examId), eq(exams.userId, userId)),
    });
    if (!exam) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Exam not found" } });
      return;
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

    trackUsage(userId, "exam-submit", 0, Date.now() - startTime, true);
    res.json({
      score,
      correct,
      total: questions.length,
      results,
      topicBreakdown,
      weakTopics: topicBreakdown.filter(t => t.percentage < 50).map(t => t.topic),
    });
  } catch (err) {
    logger.error({ err }, "Exam submit error");
    trackUsage(userId, "exam-submit", 0, Date.now() - startTime, false);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to submit exam" } });
  }
});

router.post("/summarize", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { content, fileName } = req.body as { content: string; fileName?: string };
  const startTime = Date.now();

  if (!content) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "Content is required" } });
    return;
  }

  try {
    const cached = await getCachedResponse("content-summarizer", content);
    if (cached) {
      trackUsage(userId, "content-summarizer", 0, Date.now() - startTime, true);
      res.json({ summary: JSON.parse(cached.answer), source: "knowledge", cached: true });
      return;
    }

    const response = await aiService.complete([
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
    await storeCachedResponse("content-summarizer", content, JSON.stringify(summary), "ai", 0.8);
    trackUsage(userId, "content-summarizer", 0, Date.now() - startTime, true);
    res.json({ summary });
  } catch (err) {
    logger.error({ err }, "Summarize error");
    trackUsage(userId, "content-summarizer", 0, Date.now() - startTime, false);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Summarization failed" } });
  }
});

router.post("/mnemonics", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { concept, cardIds, deckId } = req.body as { concept?: string; cardIds?: number[]; deckId?: number };
  const startTime = Date.now();

  try {
    let content = concept || "";

    if (cardIds && cardIds.length > 0) {
      const selectedCards = await db.query.cards.findMany({ where: inArray(cards.id, cardIds) });
      content = selectedCards.map(c => `${c.front}: ${c.back}`).join("\n");
    } else if (deckId) {
      const deckCards = await db.query.cards.findMany({ where: eq(cards.deckId, deckId), limit: 20 });
      content = deckCards.map(c => `${c.front}: ${c.back}`).join("\n");
    }

    if (!content) {
      res.status(400).json({ error: { code: "INVALID_INPUT", message: "Concept, cardIds, or deckId is required" } });
      return;
    }

    const response = await aiService.complete([
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
    await storeCachedResponse("mnemonic-generator", concept || content, JSON.stringify(result), "ai", 0.8);
    trackUsage(userId, "mnemonic-generator", 0, Date.now() - startTime, true);
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Mnemonic generation error");
    trackUsage(userId, "mnemonic-generator", 0, Date.now() - startTime, false);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Mnemonic generation failed" } });
  }
});

router.post("/mnemonics/save", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { cardId, mnemonic } = req.body as { cardId: number; mnemonic: string };

  try {
    await db.update(cards).set({ explanationMnemonic: mnemonic, updatedAt: new Date() }).where(eq(cards.id, cardId));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Save mnemonic error");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to save mnemonic" } });
  }
});

router.get("/coach", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
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

    const totalCardsStudied = sessions.reduce((sum, s) => sum + s.cardsStudied, 0);
    const totalKnown = sessions.reduce((sum, s) => sum + (s.knownCount || 0), 0);
    const totalUnknown = sessions.reduce((sum, s) => sum + (s.unknownCount || 0), 0);
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
      const card = allCards.find(c => c.id === p.cardId);
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
      .sort((a, b) => {
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
      .sort((a, b) => {
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

    trackUsage(userId, "progress-coach", 0, Date.now() - startTime, true);
    res.json({
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
        averageSessionLength: sessions.length > 0 ? Math.round(sessions.reduce((s, x) => s + (x.durationMinutes || 0), 0) / sessions.length) : 0,
      },
      weakTopics,
      strongTopics,
      recommendations,
      weeklyPlan,
    });
  } catch (err) {
    logger.error({ err }, "Coach error");
    trackUsage(userId, "progress-coach", 0, Date.now() - startTime, false);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Coach failed" } });
  }
});

router.post("/image-analyze", requireAuth, uploadImage.single("image"), async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const startTime = Date.now();

  if (!req.file) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "Image file is required" } });
    return;
  }

  try {
    const imageBuffer = req.file.buffer;
    const base64Image = imageBuffer.toString("base64");
    const mimeType = req.file.mimetype;

    const analysis = await aiService.complete([
      {
        role: "system",
        content: `You are a medical image analysis expert. Analyze the provided medical image and provide:
1. Key findings
2. Likely diagnosis or description
3. Teaching points
4. Generate 3-5 flashcards based on the image

Return ONLY valid JSON:
{"findings": "...", "diagnosis": "...", "teachingPoints": ["..."], "cards": [{"front": "...", "back": "...", "tags": ["..."]}]}`,
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Analyze this medical image and generate teaching points and flashcards." },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
        ],
      },
    ] as any);

    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid image analysis response");
    }

    const result = JSON.parse(jsonMatch[0]);
    await storeCachedResponse("image-analyze", `image:${mimeType}:${imageBuffer.length}`, JSON.stringify(result), "ai", 0.7);
    trackUsage(userId, "image-analyzer", 0, Date.now() - startTime, true);
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Image analysis error");
    trackUsage(userId, "image-analyzer", 0, Date.now() - startTime, false);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Image analysis failed" } });
  }
});

router.post("/voice-check", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { cardFront, cardBack, spokenAnswer } = req.body as { cardFront: string; cardBack: string; spokenAnswer: string };
  const startTime = Date.now();

  if (!spokenAnswer || !cardBack) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "spokenAnswer and cardBack are required" } });
    return;
  }

  try {
    const cacheKey = `voice:${cardFront}:${spokenAnswer}`;
    const cached = await getCachedResponse("voice-tutor", cacheKey);
    if (cached) {
      trackUsage(userId, "voice-tutor", 0, Date.now() - startTime, true);
      res.json(JSON.parse(cached.answer));
      return;
    }

    const response = await aiService.complete([
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
    await storeCachedResponse("voice-tutor", cacheKey, JSON.stringify(result), "ai", 0.8);
    trackUsage(userId, "voice-tutor", 0, Date.now() - startTime, true);
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Voice check error");
    trackUsage(userId, "voice-tutor", 0, Date.now() - startTime, false);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Voice check failed" } });
  }
});

router.post("/group-study/create", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { deckIds } = req.body as { deckIds: number[] };

  try {
    const roomId = crypto.randomBytes(4).toString("hex");
    const [room] = await db.insert(groupStudyRooms).values({
      id: roomId,
      hostUserId: userId,
      deckIds: JSON.stringify(deckIds || []),
      participants: JSON.stringify([{ userId, joinedAt: new Date().toISOString() }]),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    res.json({ room });
  } catch (err) {
    logger.error({ err }, "Create group study room error");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create room" } });
  }
});

router.post("/group-study/join", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { roomId } = req.body as { roomId: string };

  try {
    const room = await db.query.groupStudyRooms.findFirst({ where: eq(groupStudyRooms.id, roomId) });
    if (!room) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Room not found" } });
      return;
    }

    const participants = JSON.parse(room.participants);
    if (!participants.find((p: any) => p.userId === userId)) {
      participants.push({ userId, joinedAt: new Date().toISOString() });
      await db.update(groupStudyRooms).set({ participants: JSON.stringify(participants), updatedAt: new Date() }).where(eq(groupStudyRooms.id, roomId));
    }

    res.json({ room: { ...room, participants } });
  } catch (err) {
    logger.error({ err }, "Join group study room error");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to join room" } });
  }
});

router.post("/group-study/question", requireAuth, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { roomId } = req.body as { roomId: string };
  const startTime = Date.now();

  try {
    const room = await db.query.groupStudyRooms.findFirst({ where: eq(groupStudyRooms.id, roomId) });
    if (!room) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Room not found" } });
      return;
    }

    const deckIds = JSON.parse(room.deckIds);
    if (deckIds.length === 0) {
      res.status(400).json({ error: { code: "NO_DECKS", message: "No decks selected for this room" } });
      return;
    }

    const roomCards = await db.query.cards.findMany({ where: inArray(cards.deckId, deckIds), limit: 20 });
    const cardContent = roomCards.map(c => `Q: ${c.front}\nA: ${c.back}`).join("\n\n");

    const response = await aiService.complete([
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
    await storeCachedResponse("collaborative-study", `group:${roomId}:${cardContent.slice(0, 100)}`, JSON.stringify(question), "ai", 0.8);
    const questions = JSON.parse(room.questions);
    questions.push(question);
    await db.update(groupStudyRooms).set({ questions: JSON.stringify(questions), currentQuestionIndex: questions.length - 1, updatedAt: new Date() }).where(eq(groupStudyRooms.id, roomId));

    trackUsage(userId, "group-study", 0, Date.now() - startTime, true);
    res.json({ question, questionIndex: questions.length - 1 });
  } catch (err) {
    logger.error({ err }, "Group study question error");
    trackUsage(userId, "group-study", 0, Date.now() - startTime, false);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to generate question" } });
  }
});

router.get("/group-study/:roomId", requireAuth, async (req: Request, res: Response) => {
  try {
    const room = await db.query.groupStudyRooms.findFirst({ where: eq(groupStudyRooms.id, req.params.roomId) });
    if (!room) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Room not found" } });
      return;
    }
    res.json({ room });
  } catch (err) {
    logger.error({ err }, "Get group study room error");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get room" } });
  }
});

router.get("/usage", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
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

    res.json({ usage, byAgent, totalCalls: usage.length });
  } catch (err) {
    logger.error({ err }, "Agent usage error");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get usage" } });
  }
});

export default router;
