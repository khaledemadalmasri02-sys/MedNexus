import { Router, Request, Response } from "express";
import { db, cards, decks } from "../db/index.js";
import { eq, inArray } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { AIService } from "../lib/ai.js";

const router = Router();

function getUserId(req: Request): string | null {
  return req.isAuthenticated() ? req.user!.id : null;
}

// In-memory cache for analysis results (keyed by deckId)
const analysisCache = new Map<number, { results: CardAnalysis[]; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

interface CardAnalysis {
  cardId: number;
  score: number;
  issues: string[];
  suggestion: string;
  duplicateOf?: number;
}

// ── POST /api/decks/:id/analyze — AI card quality analysis ──
router.post("/decks/:id/analyze", async (req: Request, res: Response) => {
  const deckId = parseInt(req.params.id, 10);
  if (isNaN(deckId)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } });
    return;
  }

  try {
    const deckCards = await db.query.cards.findMany({
      where: eq(cards.deckId, deckId),
    });

    if (deckCards.length === 0) {
      res.json({ analyses: [], message: "No cards to analyze" });
      return;
    }

    // Check cache
    const cached = analysisCache.get(deckId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.json({ analyses: cached.results, cached: true });
      return;
    }

    const aiService = new AIService();

    // Build prompt for batch analysis
    const cardsList = deckCards.map((c, i) => {
      const choices = c.choices ? `\nChoices: ${c.choices}` : "";
    return `Card ${i + 1}:
Front: ${c.front}
Back: ${c.back}${choices}`;
    }).join("\n\n");

    const prompt = `Analyze these flashcards for quality. For each card, evaluate:
1. Clarity of the question (is it specific and unambiguous?)
2. Accuracy of the answer (is it correct and complete?)
3. Specificity (is it too vague or too narrow?)
4. Duplication (does it test the same concept as another card?)
5. Difficulty level (is it appropriate for medical students?)

Return a JSON array with one object per card:
[{
  "cardIndex": 0,
  "score": 1-10,
  "issues": ["issue1", "issue2"],
  "suggestion": "How to improve this card",
  "duplicateOf": null or cardIndex
]

Cards:
${cardsList}

Return ONLY the JSON array, no other text.`;

    const analysisText = await aiService.complete(
      [{ role: "user" as const, content: prompt }],
      { maxTokens: 4000 }
    );

    // Parse the JSON response
    let analyses: CardAnalysis[] = [];
    try {
      const jsonMatch = analysisText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        analyses = parsed.map((item: { cardIndex: number; score: number; issues: string[]; suggestion: string; duplicateOf?: number }) => ({
          cardId: deckCards[item.cardIndex]?.id || 0,
          score: Math.min(10, Math.max(1, item.score || 5)),
          issues: Array.isArray(item.issues) ? item.issues : [],
          suggestion: item.suggestion || "",
          duplicateOf: item.duplicateOf !== null && item.duplicateOf !== undefined
            ? deckCards[item.duplicateOf]?.id || undefined
            : undefined,
        }));
      }
    } catch (parseErr) {
      logger.warn({ err: parseErr, text: analysisText.slice(0, 200) }, "Failed to parse AI analysis response");
      // Fallback: return basic scores
      analyses = deckCards.map(c => ({
        cardId: c.id,
        score: 5,
        issues: ["AI analysis could not be parsed"],
        suggestion: "Try analyzing again",
      }));
    }

    // Cache results
    analysisCache.set(deckId, { results: analyses, timestamp: Date.now() });

    res.json({ analyses, cached: false });
  } catch (err) {
    logger.error({ err }, "Failed to analyze deck");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to analyze deck" } });
  }
});

// ── POST /api/cards/:id/improve — AI-improved version of a card ──
router.post("/cards/:id/improve", async (req: Request, res: Response) => {
  const cardId = parseInt(req.params.id, 10);
  if (isNaN(cardId)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid card ID" } });
    return;
  }

  try {
    const card = await db.query.cards.findFirst({ where: eq(cards.id, cardId) });
    if (!card) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Card not found" } });
      return;
    }

    const aiService = new AIService();

    const prompt = `Improve this medical flashcard. Make the front more specific as a clinical vignette question. Ensure the back has a clear, concise answer with key points.

Original Front: ${card.front}
Original Back: ${card.back}

Return JSON: { "front": "improved question", "back": "improved answer", "explanation": "why this is better" }

Return ONLY the JSON, no other text.`;

    const result = await aiService.complete(
      [{ role: "user" as const, content: prompt }],
      { maxTokens: 1000 }
    );

    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        res.json({
          front: parsed.front || card.front,
          back: parsed.back || card.back,
          explanation: parsed.explanation || "",
        });
      } else {
        res.json({ front: card.front, back: card.back, explanation: "AI did not return valid JSON" });
      }
    } catch {
      res.json({ front: card.front, back: card.back, explanation: "Failed to parse AI response" });
    }
  } catch (err) {
    logger.error({ err }, "Failed to improve card");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to improve card" } });
  }
});

// ── POST /api/decks/:id/insights — AI deck-level insights ──
router.post("/decks/:id/insights", async (req: Request, res: Response) => {
  const deckId = parseInt(req.params.id, 10);
  if (isNaN(deckId)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } });
    return;
  }

  try {
    const deck = await db.query.decks.findFirst({ where: eq(decks.id, deckId) });
    if (!deck) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Deck not found" } });
      return;
    }

    const deckCards = await db.query.cards.findMany({
      where: eq(cards.deckId, deckId),
    });

    if (deckCards.length === 0) {
      res.json({ insights: null, message: "No cards to analyze" });
      return;
    }

    const aiService = new AIService();

    // Sample up to 30 cards for the prompt
    const sampleCards = deckCards.slice(0, 30);
    const cardsList = sampleCards.map((c, i) =>
      `${i + 1}. Q: ${c.front}\n   A: ${c.back}`
    ).join("\n");

    const prompt = `Analyze this medical flashcard deck and provide insights.

Deck: ${deck.name}
${deck.description ? `Description: ${deck.description}` : ""}
Total cards: ${deckCards.length}

Sample cards:
${cardsList}

Provide a JSON response with:
{
  "knowledgeGaps": [{"topic": "topic name", "severity": "critical|moderate|minor", "explanation": "why this matters"}],
  "tooEasyCards": [cardIndex],
  "recommendedNewCards": [{"topic": "topic", "suggestedFront": "...", "suggestedBack": "..."}],
  "studyOrder": ["recommended study sequence"],
  "curriculumAlignment": {"percentage": 0-100, "covered": ["topic1"], "missing": ["topic2"]},
  "summary": "2-3 sentence overall assessment"
}

Return ONLY the JSON, no other text.`;

    const result = await aiService.complete(
      [{ role: "user" as const, content: prompt }],
      { maxTokens: 3000 }
    );

    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        res.json({ insights: parsed });
      } else {
        res.json({ insights: null, message: "AI did not return valid JSON" });
      }
    } catch {
      res.json({ insights: null, message: "Failed to parse AI response" });
    }
  } catch (err) {
    logger.error({ err }, "Failed to get deck insights");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get insights" } });
  }
});

export default router;
