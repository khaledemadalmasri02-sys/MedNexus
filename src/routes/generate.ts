import { Hono } from "hono";
import type { AppEnv } from "../types";
import { decks, cards, generationLogs } from "../db/index";
import { getConfig } from "../lib/config";
import { getDb, getUserId, readJson, insertBatched } from "../lib/helpers";
import { createAIService, PartialGenerationError } from "../lib/ai";
import { validate, generateSchema } from "../middleware/validate";

export const generateRoutes = new Hono<AppEnv>();

// ── Offline generator (ported inline from lib/offline-generator.ts) ──
// Pure-JS heuristic fallback used when no AI provider key is configured or the
// AI service returns an auth/availability error. No Node builtins.
interface GeneratedCardLocal {
  front: string;
  back: string;
  tags?: string[];
}
interface GeneratedQuestionLocal {
  front: string;
  back: string;
  choices: string[];
  correctIndex: number;
  explanation?: string;
}

const DISTRACTOR_PATTERNS = {
  prefixes: ["Hyper", "Hypo", "Anti", "Pre", "Post", "Sub", "Super", "Trans"],
  suffixes: ["itis", "osis", "emia", "pathy", "plasty", "tomy", "scopy", "gram"],
};

function extractKeySentences(text: string): string[] {
  const sentences = text
    .replace(/\n+/g, ". ")
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 300);
  return [...new Set(sentences)];
}

function extractKeyTerms(text: string): string[] {
  const terms = new Set<string>();
  const capitalizedMatches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  if (capitalizedMatches) {
    capitalizedMatches.forEach((term) => {
      if (term.length > 3 && !["The", "This", "That", "These", "Those", "There", "Their"].includes(term)) {
        terms.add(term);
      }
    });
  }
  const formattedMatches = text.match(/\*+([^*]+)\*+/g);
  if (formattedMatches) {
    formattedMatches.forEach((match) => {
      const term = match.replace(/\*/g, "").trim();
      if (term.length > 2) terms.add(term);
    });
  }
  const definitionMatches = text.match(/\b(\w+)\s*\([^)]+\)/g);
  if (definitionMatches) {
    definitionMatches.forEach((match) => {
      const term = match.split("(")[0].trim();
      if (term.length > 2) terms.add(term);
    });
  }
  return Array.from(terms).slice(0, 50);
}

function generateQuestionFromSentence(sentence: string, keyTerms: string[]): GeneratedCardLocal | null {
  const termToBlank = keyTerms.find(
    (term) => sentence.toLowerCase().includes(term.toLowerCase()) && term.length > 3
  );
  if (!termToBlank) return null;
  const question = sentence.replace(new RegExp(`\\b${escapeRegex(termToBlank)}\\b`, "i"), "___________");
  return {
    front: `What term completes this statement?\n\n${question}`,
    back: termToBlank,
    tags: ["fill-in-blank"],
  };
}

function generateDefinitionCard(term: string, context: string): GeneratedCardLocal | null {
  const sentences = context.split(/[.!?]+/);
  const definitionSentence = sentences.find(
    (s) => s.toLowerCase().includes(term.toLowerCase()) && s.length > 30
  );
  if (!definitionSentence) return null;
  return {
    front: `Define: ${term}`,
    back: definitionSentence.trim(),
    tags: ["definition"],
  };
}

function generateMCQFromContent(
  sentence: string,
  correctAnswer: string,
  allTerms: string[]
): GeneratedQuestionLocal | null {
  const distractors = allTerms
    .filter((term) => term !== correctAnswer && term.length > 2 && !sentence.toLowerCase().includes(term.toLowerCase()))
    .slice(0, 3);
  while (distractors.length < 3) {
    distractors.push(generateSyntheticDistractor(correctAnswer, distractors));
  }
  const choices = [correctAnswer, ...distractors.slice(0, 3)];
  const shuffledChoices = shuffleArray(choices);
  const correctIndex = shuffledChoices.indexOf(correctAnswer);
  return {
    front: `Which of the following best relates to: ${sentence.substring(0, 100)}...`,
    back: correctAnswer,
    choices: shuffledChoices,
    correctIndex,
    explanation: `The correct answer is "${correctAnswer}" based on the provided content.`,
  };
}

function generateSyntheticDistractor(correctAnswer: string, existingDistractors: string[]): string {
  const prefix = DISTRACTOR_PATTERNS.prefixes[Math.floor(Math.random() * DISTRACTOR_PATTERNS.prefixes.length)];
  const suffix = DISTRACTOR_PATTERNS.suffixes[Math.floor(Math.random() * DISTRACTOR_PATTERNS.suffixes.length)];
  const strategies = [
    () => `${prefix}${correctAnswer.toLowerCase()}`,
    () => `${correctAnswer}${suffix}`,
    () => `${prefix}${correctAnswer.toLowerCase()}${suffix}`,
    () => `Non-${correctAnswer.toLowerCase()}`,
    () => `Pseudo${correctAnswer.toLowerCase()}`,
  ];
  for (const strategy of strategies) {
    const distractor = strategy();
    if (!existingDistractors.includes(distractor) && distractor !== correctAnswer) {
      return distractor;
    }
  }
  return `Alternative ${correctAnswer}`;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

class OfflineGenerator {
  generateCards(text: string, count = 10): GeneratedCardLocal[] {
    const result: GeneratedCardLocal[] = [];
    const keyTerms = extractKeyTerms(text);
    const sentences = extractKeySentences(text);
    for (const sentence of sentences) {
      if (result.length >= count) break;
      const card = generateQuestionFromSentence(sentence, keyTerms);
      if (card && !result.some((c) => c.back === card.back)) result.push(card);
    }
    for (const term of keyTerms) {
      if (result.length >= count) break;
      const card = generateDefinitionCard(term, text);
      if (card && !result.some((c) => c.front === card.front)) result.push(card);
    }
    for (const sentence of sentences) {
      if (result.length >= count) break;
      if (sentence.includes(" is ") || sentence.includes(" are ")) {
        const parts = sentence.split(/\s+(?:is|are)\s+/i);
        if (parts.length === 2 && parts[0].length > 2 && parts[1].length > 5) {
          const card: GeneratedCardLocal = {
            front: `What ${sentence.includes(" are ") ? "are" : "is"} ${parts[0].trim()}?`,
            back: parts[1].trim(),
            tags: ["q-and-a"],
          };
          if (!result.some((c) => c.front === card.front)) result.push(card);
        }
      }
    }
    return result.slice(0, count);
  }

  generateQuestions(text: string, count = 10): GeneratedQuestionLocal[] {
    const result: GeneratedQuestionLocal[] = [];
    const keyTerms = extractKeyTerms(text);
    const sentences = extractKeySentences(text);
    for (const term of keyTerms) {
      if (result.length >= count) break;
      const contextSentence = sentences.find((s) => s.toLowerCase().includes(term.toLowerCase()));
      if (contextSentence) {
        const question = generateMCQFromContent(contextSentence, term, keyTerms);
        if (question && !result.some((q) => q.back === question.back)) result.push(question);
      }
    }
    for (const sentence of sentences) {
      if (result.length >= count) break;
      const words = sentence.split(/\s+/);
      const keyWord = words.find((w) => w.length > 5 && /^[A-Z]/.test(w));
      if (keyWord) {
        const question = generateMCQFromContent(sentence, keyWord, keyTerms);
        if (question && !result.some((q) => q.back === question.back)) result.push(question);
      }
    }
    return result.slice(0, count);
  }
}

const offlineGenerator = new OfflineGenerator();

// Only genuine availability/auth/quota problems fall back to offline generation.
// A plain "limit exceeded" is excluded (oversized prompts, not outages).
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

async function logGeneration(
  c: any,
  userId: string | null,
  type: string,
  model: string,
  success: boolean,
  errorMessage?: string,
  durationMs?: number
): Promise<void> {
  try {
    await getDb(c).insert(generationLogs).values({
      userId,
      type,
      model,
      durationMs,
      success,
      errorMessage,
      createdAt: new Date(),
    });
  } catch {
    /* best-effort logging */
  }
}

// Parse/format failures from the AI service should also fall back to the
// offline generator so a deck is always produced.
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

function tryGenerate(
  ai: ReturnType<typeof createAIService>,
  deckType: string,
  text: string,
  cardCount: number,
  options: { concurrency?: number; deadlineMs?: number }
): Promise<(GeneratedCardLocal | GeneratedQuestionLocal)[]> {
  return deckType === "qbank"
    ? (ai.generateQuestions(text, cardCount, options) as Promise<(GeneratedCardLocal | GeneratedQuestionLocal)[]>)
    : (ai.generateCards(text, cardCount, options) as Promise<(GeneratedCardLocal | GeneratedQuestionLocal)[]>);
}

function offlineGenerate(
  deckType: string,
  text: string,
  cardCount: number
): (GeneratedCardLocal | GeneratedQuestionLocal)[] {
  return deckType === "qbank"
    ? offlineGenerator.generateQuestions(text, cardCount)
    : offlineGenerator.generateCards(text, cardCount);
}

// Ensure every qbank item has string[] choices of length >= 3 and a valid
// numeric correctIndex.
function normalizeQbankItem(q: GeneratedQuestionLocal): GeneratedQuestionLocal {
  const choices = Array.isArray(q.choices) ? q.choices.filter((c) => typeof c === "string") : [];
  while (choices.length < 3) choices.push(`Option ${choices.length + 1}`);
  let correctIndex = typeof q.correctIndex === "number" ? q.correctIndex : 0;
  if (correctIndex < 0 || correctIndex >= choices.length || !choices[correctIndex]) correctIndex = 0;
  return { ...q, front: q.front || "", back: q.back || "", choices, correctIndex };
}

// Absolute last-resort heuristic so a non-trivial text always yields >= 1 card.
function lastResortGenerate(
  deckType: string,
  text: string,
  count: number
): (GeneratedCardLocal | GeneratedQuestionLocal)[] {
  const sentences = extractKeySentences(text);
  const cards: (GeneratedCardLocal | GeneratedQuestionLocal)[] = [];
  for (const sentence of sentences) {
    if (sentence.includes(" is ") || sentence.includes(" are ")) {
      const parts = sentence.split(/\s+(?:is|are)\s+/i);
      if (parts.length === 2 && parts[0].length > 2 && parts[1].length > 5) {
        if (deckType === "qbank") {
          const correct = parts[1].trim();
          cards.push({
            front: `Which is correct: ${parts[0].trim()}?`,
            back: correct,
            choices: [correct, `Not ${correct.toLowerCase()}`, `Pseudo${correct.toLowerCase()}`, `Non-${correct.toLowerCase()}`],
            correctIndex: 0,
            explanation: sentence,
          });
        } else {
          cards.push({
            front: `What ${sentence.includes(" are ") ? "are" : "is"} ${parts[0].trim()}?`,
            back: parts[1].trim(),
            tags: ["q-and-a"],
          });
        }
      }
    }
    if (cards.length >= count) break;
  }
  if (cards.length === 0 && sentences.length > 0) {
    const s = sentences[0];
    if (deckType === "qbank") {
      cards.push({
        front: `Which statement is supported by the text?`,
        back: s,
        choices: [s, "None of the above", "Partially correct", "Incorrect"],
        correctIndex: 0,
        explanation: s,
      });
    } else {
      cards.push({ front: `Summarize: ${s.substring(0, 80)}...`, back: s, tags: ["generated"] });
    }
  }
  return cards.slice(0, count);
}

// After AI + offline fallback, guarantee at least one item exists.
function ensureNonEmpty(
  items: (GeneratedCardLocal | GeneratedQuestionLocal)[],
  deckType: string,
  text: string,
  cardCount: number
): { items: (GeneratedCardLocal | GeneratedQuestionLocal)[]; usedOffline: boolean } {
  if (items.length > 0) return { items, usedOffline: false };
  const offline = offlineGenerate(deckType, text, cardCount);
  if (offline.length > 0) return { items: offline, usedOffline: true };
  return { items: lastResortGenerate(deckType, text, cardCount), usedOffline: true };
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sseResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ── POST /api/generate — cards only, no explanations ──
generateRoutes.post("/generate", validate(generateSchema), async (c) => {
  const { text, deckName, cardCount = 10, deckType = "deck" } = c.get("validated") as any;

  const userId = getUserId(c);
  const startTime = Date.now();
  const config = getConfig(c.env);
  const model = deckType === "qbank" ? config.AI_QBANK_MODEL : config.AI_TEXT_MODEL;
  const ai = createAIService(c.env);
  const genOptions = genOptionsFromEnv(c);
  const requestedCount = cardCount;

  try {
    let generatedItems: (GeneratedCardLocal | GeneratedQuestionLocal)[] = [];
    const deckKind: "deck" | "qbank" = deckType === "qbank" ? "qbank" : "deck";
    let usedOfflineFallback = false;
    let partialGeneration = false;

    try {
      generatedItems = await tryGenerate(ai, deckType, text, cardCount, genOptions);
    } catch (aiErr) {
      if (aiErr instanceof PartialGenerationError) {
        generatedItems = aiErr.items;
        partialGeneration = true;
      } else if (isAuthError(aiErr as Error) || isParseError(aiErr as Error)) {
        usedOfflineFallback = true;
        generatedItems = offlineGenerate(deckType, text, cardCount);
      } else {
        throw aiErr;
      }
    }
    const ensured = ensureNonEmpty(generatedItems, deckType, text, cardCount);
    generatedItems = ensured.items;
    if (ensured.usedOffline) usedOfflineFallback = true;

    const [deck] = await getDb(c).insert(decks).values({
      name: deckName,
      description: usedOfflineFallback
        ? `Generated ${deckKind} from text input (offline mode)`
        : `AI generated ${deckKind} from text input`,
      kind: deckKind,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    const createdCards = await insertBatched(
      getDb(c),
      cards,
      generatedItems.map((item) => {
        const isQuestion = "choices" in item;
        const rawQuestion = isQuestion ? (item as GeneratedQuestionLocal) : null;
        const question = rawQuestion ? normalizeQbankItem(rawQuestion) : null;
        const card = !isQuestion ? (item as GeneratedCardLocal) : null;
        return {
          deckId: deck.id,
          front: item.front,
          back: item.back,
          tags: card?.tags?.join(",") || null,
          cardType: isQuestion ? "mcq" : "basic",
          choices: question?.choices ? JSON.stringify(question.choices) : null,
          correctIndex: question?.correctIndex ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      })
    );

    const duration = Date.now() - startTime;
    await logGeneration(
      c,
      userId,
      deckKind,
      usedOfflineFallback ? "offline-fallback" : model,
      true,
      undefined,
      duration
    );

    return c.json({
      deck,
      cards: createdCards,
      generationId: deck.id,
      duration,
      usedOfflineFallback,
      partial: partialGeneration,
      requestedCount,
      generatedCount: createdCards.length,
      message: partialGeneration
        ? `Generation timed out but ${createdCards.length} of ${requestedCount} requested cards were saved. Re-run to generate the rest.`
        : "Cards generated successfully. Use /explanations/generate/:deckId to generate study mode explanations.",
    }, partialGeneration ? 200 : 201);
  } catch (err) {
    const duration = Date.now() - startTime;
    await logGeneration(c, userId, deckType, model, false, (err as Error).message, duration);
    const isAuth = isAuthError(err as Error);
    return c.json(
      {
        error: {
          code: isAuth ? "AUTH_ERROR" : "GENERATION_ERROR",
          message: isAuth
            ? "AI service authentication failed. Please check your API key configuration."
            : "Failed to generate cards. Please try again.",
        },
      },
      isAuth ? 401 : 500
    );
  }
});

// ── POST /api/generate/stream — SSE stream (cards only, no explanations) ──
generateRoutes.post("/generate/stream", async (c) => {
  const body = await readJson(c);
  const { text, deckName, cardCount = 10, deckType = "deck" } = body as any;

  if (!text || typeof text !== "string") {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Text content is required" } }, 400);
  }
  if (!deckName || typeof deckName !== "string") {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Deck name is required" } }, 400);
  }

  const userId = getUserId(c);
  const config = getConfig(c.env);
  const model = deckType === "qbank" ? config.AI_QBANK_MODEL : config.AI_TEXT_MODEL;
  const ai = createAIService(c.env);
  const genOptions = genOptionsFromEnv(c);
  const requestedCount = cardCount;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sseEvent(event, data)));
      const startTime = Date.now();
      let usedOfflineFallback = false;
      let partialGeneration = false;

      try {
        send("status", { message: "Starting generation..." });

        let generatedItems: (GeneratedCardLocal | GeneratedQuestionLocal)[] = [];
        try {
          generatedItems = await tryGenerate(ai, deckType, text, cardCount, genOptions);
        } catch (aiErr) {
          if (aiErr instanceof PartialGenerationError) {
            generatedItems = aiErr.items;
            partialGeneration = true;
            send("status", { message: `Generation timed out; saving ${generatedItems.length} cards produced so far...` });
          } else if (isAuthError(aiErr as Error) || isParseError(aiErr as Error)) {
            usedOfflineFallback = true;
            send("status", { message: "AI service unavailable, using offline generator..." });
            generatedItems = offlineGenerate(deckType, text, cardCount);
          } else {
            throw aiErr;
          }
        }
        const ensured = ensureNonEmpty(generatedItems, deckType, text, cardCount);
        generatedItems = ensured.items;
        if (ensured.usedOffline) usedOfflineFallback = true;

        const [deck] = await getDb(c).insert(decks).values({
          name: deckName,
          description: usedOfflineFallback
            ? `Generated ${deckType === "qbank" ? "qbank" : "deck"} from text input (offline mode)`
            : `AI generated ${deckType === "qbank" ? "qbank" : "deck"} from text input`,
          kind: deckType === "qbank" ? "qbank" : "deck",
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();

        send("deck_created", { deckId: deck.id, name: deck.name });

        const cardsToInsert: any[] = [];
        for (const item of generatedItems) {
          const isQuestion = "choices" in item;
          const question = isQuestion ? normalizeQbankItem(item as GeneratedQuestionLocal) : null;
          const card = !isQuestion ? (item as GeneratedCardLocal) : null;
          cardsToInsert.push({
            deckId: deck.id,
            front: item.front,
            back: item.back,
            tags: card?.tags?.join(",") || null,
            cardType: isQuestion ? "mcq" : "basic",
            choices: question?.choices ? JSON.stringify(question.choices) : null,
            correctIndex: question?.correctIndex ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          if (question) {
            send("card", {
              front: question.front,
              back: question.back,
              choices: question.choices,
              correctIndex: question.correctIndex,
            });
          } else if (card) {
            send("card", card);
          }
        }

        const createdCards = await insertBatched(getDb(c), cards, cardsToInsert);
        const duration = Date.now() - startTime;
        await logGeneration(
          c,
          userId,
          deckType,
          usedOfflineFallback ? "offline-fallback" : model,
          true,
          undefined,
          duration
        );

        send("complete", {
          deck,
          cards: createdCards,
          generationId: deck.id,
          duration,
          usedOfflineFallback,
          partial: partialGeneration,
          requestedCount,
          generatedCount: createdCards.length,
          message: partialGeneration
            ? `Generation timed out but ${createdCards.length} of ${requestedCount} requested cards were saved. Re-run to generate the rest.`
            : "Cards generated. Use /explanations/generate/:deckId for study explanations.",
        });
      } catch (err) {
        const duration = Date.now() - startTime;
        await logGeneration(c, userId, deckType, model, false, (err as Error).message, duration);
        const isAuth = isAuthError(err as Error);
        send("error", {
          message: isAuth
            ? "AI service authentication failed. Using offline mode."
            : "Generation failed. Please try again.",
          code: isAuth ? "AUTH_ERROR" : "GENERATION_ERROR",
        });
      } finally {
        controller.close();
      }
    },
  });

  return sseResponse(stream);
});
