import { Hono } from "hono";
import type { AppEnv } from "../types";
import { decks, cards, generationLogs } from "../db/index";
import { getConfig } from "../lib/config";
import { getDb, getUserId, readJson, insertBatched } from "../lib/helpers";
import { createAIService, type GeneratedCard, type GeneratedQuestion, type GenerateOptions } from "../lib/ai";
import { offlineGenerator } from "../lib/offline-generator";
import { validate, generateSchema } from "../middleware/validate";
import { logger } from "../lib/logger";
import { captureGenerationError } from "../lib/error-capture";

export const generateRoutes = new Hono<AppEnv>();

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
    message.includes("ai api error") ||
    message.includes("fetch failed") ||
    message.includes("econnrefused") ||
    message.includes("enotfound")
  );
}

function isParseError(error: Error): boolean {
  return /invalid response format|no json|parse/i.test(error.message);
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

function genOptionsFromEnv(c: any): GenerateOptions {
  const env = c.env as Record<string, string>;
  const concurrency = Number(env.GEN_CONCURRENCY);
  return {
    concurrency: Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 1,
  };
}

function tryGenerate(
  ai: ReturnType<typeof createAIService>,
  deckType: string,
  text: string,
  cardCount: number,
  options: GenerateOptions
): Promise<(GeneratedCard | GeneratedQuestion)[]> {
  if (deckType === "qbank") {
    return ai.generateQuestions(text, cardCount, options) as Promise<(GeneratedCard | GeneratedQuestion)[]>;
  }
  return ai.generateCards(text, cardCount, options) as Promise<(GeneratedCard | GeneratedQuestion)[]>;
}

function offlineGenerate(
  deckType: string,
  text: string,
  cardCount: number
): (GeneratedCard | GeneratedQuestion)[] {
  if (deckType === "qbank") {
    return offlineGenerator.generateQuestions(text, cardCount) as (GeneratedCard | GeneratedQuestion)[];
  }
  return offlineGenerator.generateCards(text, cardCount) as (GeneratedCard | GeneratedQuestion)[];
}

function ensureNonEmpty(
  items: (GeneratedCard | GeneratedQuestion)[],
  deckType: string,
  text: string,
  cardCount: number
): { items: (GeneratedCard | GeneratedQuestion)[]; usedOffline: boolean } {
  if (items.length > 0) return { items, usedOffline: false };
  const offline = offlineGenerate(deckType, text, cardCount);
  if (offline.length > 0) return { items: offline, usedOffline: true };
  const sentences = text.replace(/\n+/g, ". ").split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 20 && s.length < 300);
  const cards: (GeneratedCard | GeneratedQuestion)[] = [];
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
    if (cards.length >= cardCount) break;
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
  return { items: cards.slice(0, cardCount), usedOffline: true };
}

function normalizeQbankItem(q: GeneratedQuestion): GeneratedQuestion {
  const choices = Array.isArray(q.choices) ? q.choices.filter((c) => typeof c === "string") : [];
  while (choices.length < 3) choices.push(`Option ${choices.length + 1}`);
  let correctIndex = typeof q.correctIndex === "number" ? q.correctIndex : 0;
  if (correctIndex < 0 || correctIndex >= choices.length || !choices[correctIndex]) correctIndex = 0;
  return { ...q, front: q.front || "", back: q.back || "", choices, correctIndex };
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
    let generatedItems: (GeneratedCard | GeneratedQuestion)[] = [];
    const deckKind: "deck" | "qbank" = deckType === "qbank" ? "qbank" : "deck";
    let usedOfflineFallback = false;

    try {
      generatedItems = await tryGenerate(ai, deckType, text, cardCount, genOptions);
    } catch (aiErr) {
      logger.warn({ err: (aiErr as Error)?.message, deckType }, "AI generation failed, using offline fallback");
      usedOfflineFallback = true;
      await captureGenerationError(getDb(c), aiErr as Error, {
        userId,
        operation: `generate:${deckType}`,
        model,
        inputText: text,
        extra: { deckName, cardCount: requestedCount, fallback: "offline" },
      });
      generatedItems = offlineGenerate(deckType, text, cardCount);
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
        const question = isQuestion ? normalizeQbankItem(item as GeneratedQuestion) : null;
        const card = !isQuestion ? (item as GeneratedCard) : null;
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
      partial: false,
      requestedCount,
      generatedCount: createdCards.length,
      message: "Cards generated successfully. Use /explanations/generate/:deckId to generate study mode explanations.",
    }, 201);
  } catch (err) {
    const duration = Date.now() - startTime;
    await logGeneration(c, userId, deckType, model, false, (err as Error).message, duration);
    await captureGenerationError(getDb(c), err as Error, {
      userId,
      operation: `generate:${deckType}`,
      model,
      inputText: text,
      extra: { deckName, cardCount: requestedCount, durationMs: duration },
    });
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
      let closed = false;
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sseEvent(event, data)));
      const closeWhenReady = () => {
        if (closed) return;
        closed = true;
        setTimeout(() => { try { controller.close(); } catch { /* already closed */ } }, 100);
      };
      const startTime = Date.now();
      let usedOfflineFallback = false;

      try {
        send("status", { message: "Starting generation..." });

        const [deck] = await getDb(c).insert(decks).values({
          name: deckName,
          description: `AI generated ${deckType === "qbank" ? "qbank" : "deck"} from text input`,
          kind: deckType === "qbank" ? "qbank" : "deck",
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();

        send("deck_created", { deckId: deck.id, name: deck.name });

        const cardsToInsert: any[] = [];

        if (deckType === "qbank") {
          send("status", { message: "Generating questions..." });
          let questions: GeneratedQuestion[] = [];
          try {
            questions = await ai.generateQuestions(text, cardCount, genOptions);
            if (!questions || questions.length === 0) {
              throw new Error("AI returned empty questions");
            }
          } catch (aiErr) {
            logger.warn({ err: (aiErr as Error)?.message }, "AI question generation failed, using offline fallback");
            usedOfflineFallback = true;
            send("status", { message: "AI service unavailable, using offline generator..." });
            questions = offlineGenerator.generateQuestions(text, cardCount) as GeneratedQuestion[];
          }
          for (const q of questions) {
            const question = normalizeQbankItem(q);
            cardsToInsert.push({
              deckId: deck.id,
              front: question.front,
              back: question.back,
              tags: null,
              cardType: "mcq",
              choices: question.choices ? JSON.stringify(question.choices) : null,
              correctIndex: question.correctIndex ?? null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            send("card", {
              front: question.front,
              back: question.back,
              choices: question.choices,
              correctIndex: question.correctIndex,
            });
          }
        } else {
          try {
            for await (const event of ai.streamGenerateCards(text, cardCount, genOptions)) {
              if (event.type === "progress") {
                send("status", event.data);
              } else if (event.type === "card") {
                const card = event.data as GeneratedCard;
                cardsToInsert.push({
                  deckId: deck.id,
                  front: card.front,
                  back: card.back,
                  tags: card.tags?.join(",") || null,
                  cardType: "basic",
                  choices: null,
                  correctIndex: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
                send("card", card);
              }
            }
            if (cardsToInsert.length === 0) {
              throw new Error("AI returned empty cards");
            }
          } catch (aiErr) {
            logger.warn({ err: (aiErr as Error)?.message }, "AI stream card generation failed, using offline fallback");
            usedOfflineFallback = true;
            send("status", { message: "AI service unavailable, using offline generator..." });
            cardsToInsert.length = 0;
            for await (const event of offlineGenerator.streamGenerateCards(text, cardCount)) {
              if (event.type === "progress") {
                send("status", event.data);
              } else if (event.type === "card") {
                const card = event.data as GeneratedCard;
                cardsToInsert.push({
                  deckId: deck.id,
                  front: card.front,
                  back: card.back,
                  tags: card.tags?.join(",") || null,
                  cardType: "basic",
                  choices: null,
                  correctIndex: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
                send("card", card);
              }
            }
          }
        }

        if (cardsToInsert.length === 0) {
          usedOfflineFallback = true;
          const ensured = ensureNonEmpty([], deckType, text, cardCount);
          for (const item of ensured.items) {
            const isQuestion = "choices" in item;
            const question = isQuestion ? normalizeQbankItem(item as GeneratedQuestion) : null;
            const cardItem = {
              deckId: deck.id,
              front: item.front,
              back: item.back,
              tags: (item as GeneratedCard).tags?.join(",") || null,
              cardType: isQuestion ? "mcq" : "basic",
              choices: question?.choices ? JSON.stringify(question.choices) : null,
              correctIndex: question?.correctIndex ?? null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            cardsToInsert.push(cardItem);
            send("card", {
              front: item.front,
              back: item.back,
              choices: question?.choices,
              correctIndex: question?.correctIndex,
            });
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
          partial: false,
          requestedCount,
          generatedCount: createdCards.length,
          message: "Cards generated. Use /explanations/generate/:deckId for study explanations.",
        });
        closeWhenReady();
      } catch (err) {
        const duration = Date.now() - startTime;
        logger.error({ err, deckType }, "Stream generation failed");
        await logGeneration(c, userId, deckType, model, false, (err as Error).message, duration);
        await captureGenerationError(getDb(c), err as Error, {
          userId,
          operation: `generate:stream:${deckType}`,
          model,
          inputText: text,
          extra: { deckName, cardCount: requestedCount, durationMs: duration },
        });
        const isAuth = isAuthError(err as Error);
        send("error", {
          message: isAuth
            ? "AI service authentication failed. Using offline mode."
            : "Generation failed. Please try again.",
          code: isAuth ? "AUTH_ERROR" : "GENERATION_ERROR",
          detail: (err as Error)?.message ?? String(err),
        });
        closeWhenReady();
      }
    },
  });

  return sseResponse(stream);
});