import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { AppEnv } from "../types";
import { cards, decks } from "../db/index";
import { getDb, errorJson, notFound } from "../lib/helpers";
import { createAIService } from "../lib/ai";

export const aiAnalysisRoutes = new Hono<AppEnv>();

interface CardAnalysis {
  cardId: number;
  score: number;
  issues: string[];
  suggestion: string;
  duplicateOf?: number;
}

// In-memory cache for analysis results (keyed by deckId). Best-effort: does not
// persist across Worker isolates/cold starts, matching the original in-memory design.
const analysisCache = new Map<number, { results: CardAnalysis[]; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

// ── POST /api/decks/:id/analyze ──
aiAnalysisRoutes.post("/decks/:id/analyze", async (c) => {
  const deckId = parseInt(c.req.param("id") ?? "", 10);
  if (isNaN(deckId)) {
    return errorJson(c, 400, "VALIDATION_ERROR", "Invalid deck ID");
  }

  try {
    const deckCards = await getDb(c).query.cards.findMany({ where: eq(cards.deckId, deckId) });

    if (deckCards.length === 0) {
      return c.json({ analyses: [], message: "No cards to analyze" });
    }

    const cached = analysisCache.get(deckId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return c.json({ analyses: cached.results, cached: true });
    }

    const ai = createAIService(c.env);

    const cardsList = deckCards
      .map((card, i) => {
        const choices = card.choices ? `\nChoices: ${card.choices}` : "";
        return `Card ${i + 1}:
Front: ${card.front}
Back: ${card.back}${choices}`;
      })
      .join("\n\n");

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

    const analysisText = await ai.complete([{ role: "user", content: prompt }], { maxTokens: 4000 });

    let analyses: CardAnalysis[] = [];
    try {
      const jsonMatch = analysisText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        analyses = parsed.map(
          (item: { cardIndex: number; score: number; issues: string[]; suggestion: string; duplicateOf?: number }) => ({
            cardId: deckCards[item.cardIndex]?.id || 0,
            score: Math.min(10, Math.max(1, item.score || 5)),
            issues: Array.isArray(item.issues) ? item.issues : [],
            suggestion: item.suggestion || "",
            duplicateOf:
              item.duplicateOf !== null && item.duplicateOf !== undefined
                ? deckCards[item.duplicateOf]?.id || undefined
                : undefined,
          })
        );
      }
    } catch (parseErr) {
      analyses = deckCards.map((card) => ({
        cardId: card.id,
        score: 5,
        issues: ["AI analysis could not be parsed"],
        suggestion: "Try analyzing again",
      }));
    }

    analysisCache.set(deckId, { results: analyses, timestamp: Date.now() });

    return c.json({ analyses, cached: false });
  } catch (err) {
    return errorJson(c, 500, "INTERNAL_ERROR", "Failed to analyze deck");
  }
});

// ── POST /api/cards/:id/improve ──
aiAnalysisRoutes.post("/cards/:id/improve", async (c) => {
  const cardId = parseInt(c.req.param("id") ?? "", 10);
  if (isNaN(cardId)) {
    return errorJson(c, 400, "VALIDATION_ERROR", "Invalid card ID");
  }

  try {
    const card = await getDb(c).query.cards.findFirst({ where: eq(cards.id, cardId) });
    if (!card) {
      return notFound(c, "Card not found");
    }

    const ai = createAIService(c.env);

    const prompt = `Improve this medical flashcard. Make the front more specific as a clinical vignette question. Ensure the back has a clear, concise answer with key points.

Original Front: ${card.front}
Original Back: ${card.back}

Return JSON: { "front": "improved question", "back": "improved answer", "explanation": "why this is better" }

Return ONLY the JSON, no other text.`;

    const result = await ai.complete([{ role: "user", content: prompt }], { maxTokens: 1000 });

    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return c.json({
          front: parsed.front || card.front,
          back: parsed.back || card.back,
          explanation: parsed.explanation || "",
        });
      }
      return c.json({ front: card.front, back: card.back, explanation: "AI did not return valid JSON" });
    } catch {
      return c.json({ front: card.front, back: card.back, explanation: "Failed to parse AI response" });
    }
  } catch (err) {
    return errorJson(c, 500, "INTERNAL_ERROR", "Failed to improve card");
  }
});

// ── POST /api/decks/:id/insights ──
aiAnalysisRoutes.post("/decks/:id/insights", async (c) => {
  const deckId = parseInt(c.req.param("id") ?? "", 10);
  if (isNaN(deckId)) {
    return errorJson(c, 400, "VALIDATION_ERROR", "Invalid deck ID");
  }

  try {
    const deck = await getDb(c).query.decks.findFirst({ where: eq(decks.id, deckId) });
    if (!deck) {
      return notFound(c, "Deck not found");
    }

    const deckCards = await getDb(c).query.cards.findMany({ where: eq(cards.deckId, deckId) });

    if (deckCards.length === 0) {
      return c.json({ insights: null, message: "No cards to analyze" });
    }

    const ai = createAIService(c.env);

    const sampleCards = deckCards.slice(0, 30);
    const cardsList = sampleCards.map((card, i) => `${i + 1}. Q: ${card.front}\n   A: ${card.back}`).join("\n");

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

    const result = await ai.complete([{ role: "user", content: prompt }], { maxTokens: 3000 });

    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return c.json({ insights: parsed });
      }
      return c.json({ insights: null, message: "AI did not return valid JSON" });
    } catch {
      return c.json({ insights: null, message: "Failed to parse AI response" });
    }
  } catch (err) {
    return errorJson(c, 500, "INTERNAL_ERROR", "Failed to get insights");
  }
});
