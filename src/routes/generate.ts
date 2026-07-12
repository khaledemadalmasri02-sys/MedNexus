import { Router, Request, Response } from "express";
import { db, decks, cards, generationLogs } from "../db/index.js";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { aiService, GeneratedCard, GeneratedQuestion } from "../lib/ai.js";
import { getConfig } from "../config.js";
import { offlineGenerator } from "../lib/offline-generator.js";
import { validateBody } from "../middleware/validate.js";
import { generateSchema } from "./validators.js";

const router = Router();

// Check if error should trigger offline fallback.
// IMPORTANT: only genuine availability/auth/quota problems should fall back to
// the offline generator. Transient rate limits (429) are included, but a plain
// "limit exceeded" is deliberately excluded because OpenRouter also returns
// "maximum context length exceeded" for oversized prompts — that is NOT a
// service outage and must NOT silently degrade to offline generation.
function isAuthError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return message.includes("401") ||
         message.includes("402") ||
         message.includes("429") ||
         message.includes("502") ||
         message.includes("unauthorized") ||
         message.includes("api key") ||
         message.includes("user not found") ||
         message.includes("authentication") ||
         message.includes("invalid url") ||
         message.includes("provider returned error") ||
         message.includes("rate limit") ||
         message.includes("quota") ||
         message.includes("too many requests") ||
         message.includes("temporarily unavailable");
}

// Get user ID from request
function getUserId(req: Request): string | null {
  return req.isAuthenticated() ? req.user!.id : null;
}

// Log generation
async function logGeneration(
  userId: string | null,
  type: string,
  model: string,
  success: boolean,
  errorMessage?: string,
  promptTokens?: number,
  completionTokens?: number,
  durationMs?: number
): Promise<void> {
  try {
    await db.insert(generationLogs).values({
      userId,
      type,
      model,
      promptTokens,
      completionTokens,
      durationMs,
      success,
      errorMessage,
      createdAt: new Date(),
    });
  } catch (err) {
    logger.error({ err }, "Failed to log generation");
  }
}

// Card data type for insertion (without explanations - generated separately)
interface CardToInsert {
  deckId: number;
  front: string;
  back: string;
  tags: string | null;
  cardType: string;
  choices: string | null;
  correctIndex: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Generate flashcards from text (cards only, no explanations)
router.post("/", validateBody(generateSchema), async (req: Request, res: Response) => {
  const { text, deckName, cardCount = 10, deckType = "deck" } = req.body;

  const userId = getUserId(req);
  const startTime = Date.now();
  const model = deckType === "qbank" 
    ? getConfig().AI_QBANK_MODEL 
    : getConfig().AI_TEXT_MODEL;
  
  try {
    let generatedItems: (GeneratedCard | GeneratedQuestion)[];
    let deckKind: "deck" | "qbank" = deckType === "qbank" ? "qbank" : "deck";
    let usedOfflineFallback = false;
    
    // Try AI service first, fall back to offline generator on auth errors
    try {
      if (deckType === "qbank") {
        generatedItems = await aiService.generateQuestions(text, cardCount);
      } else {
        generatedItems = await aiService.generateCards(text, cardCount);
      }
    } catch (aiErr) {
      // Check if this is an authentication/API key error
      if (isAuthError(aiErr as Error)) {
        logger.warn({ err: aiErr }, "AI API auth failed, falling back to offline generator");
        usedOfflineFallback = true;
        
        // Fall back to offline generator
        if (deckType === "qbank") {
          generatedItems = offlineGenerator.generateQuestions(text, cardCount);
        } else {
          generatedItems = offlineGenerator.generateCards(text, cardCount);
        }
      } else {
        // Re-throw if it's not an auth error
        throw aiErr;
      }
    }
    
    // Create deck
    const [deck] = await db.insert(decks).values({
      name: deckName,
      description: usedOfflineFallback 
        ? `Generated ${deckKind} from text input (offline mode)`
        : `AI generated ${deckKind} from text input`,
      kind: deckKind,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    // Create cards/questions (without explanations - will be generated separately)
    const createdCards = await db.insert(cards).values(
      generatedItems.map((item) => {
        const isQuestion = "choices" in item;
        const question = isQuestion ? (item as GeneratedQuestion) : null;
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
          // Explanations will be generated separately via /explanations/generate/:deckId
        };
      })
    ).returning();
    
    const duration = Date.now() - startTime;
    
    // Log successful generation
    await logGeneration(
      userId, 
      deckKind, 
      usedOfflineFallback ? "offline-fallback" : model, 
      true, 
      undefined, 
      undefined, 
      undefined, 
      duration
    );
    
    res.status(201).json({
      deck,
      cards: createdCards,
      generationId: deck.id,
      duration,
      usedOfflineFallback,
      message: "Cards generated successfully. Use /explanations/generate/:deckId to generate study mode explanations.",
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    await logGeneration(userId, deckType, model, false, (err as Error).message, undefined, undefined, duration);
    
    logger.error({ err }, "Generation failed");
    
    // Provide specific error message for auth errors
    const isAuth = isAuthError(err as Error);
    res.status(isAuth ? 401 : 500).json({
      error: { 
        code: isAuth ? "AUTH_ERROR" : "GENERATION_ERROR", 
        message: isAuth 
          ? "AI service authentication failed. Please check your API key configuration."
          : "Failed to generate cards. Please try again.",
      },
    });
  }
});

// Stream generation with SSE (cards only, no explanations)
router.post("/stream", async (req: Request, res: Response) => {
  const { text, deckName, cardCount = 10, deckType = "deck" } = req.body;
  
  if (!text || typeof text !== "string") {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Text content is required" },
    });
    return;
  }
  
  if (!deckName || typeof deckName !== "string") {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Deck name is required" },
    });
    return;
  }
  
  const userId = getUserId(req);
  const model = deckType === "qbank" 
    ? getConfig().AI_QBANK_MODEL 
    : getConfig().AI_TEXT_MODEL;
  
  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  
  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  
  const startTime = Date.now();
  let usedOfflineFallback = false;
  
  try {
    sendEvent("status", { message: "Starting generation..." });
    
    // Create deck first
    const [deck] = await db.insert(decks).values({
      name: deckName,
      description: `AI generated ${deckType} from text input`,
      kind: deckType === "qbank" ? "qbank" : "deck",
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    sendEvent("deck_created", { deckId: deck.id, name: deck.name });
    
    // Stream card generation (no explanations)
    const cardsToInsert: CardToInsert[] = [];
    
    if (deckType === "qbank") {
      // For QBank, we generate all at once (streaming MCQ is complex)
      sendEvent("status", { message: "Generating questions..." });
      
      let questions: GeneratedQuestion[];
      
      try {
        questions = await aiService.generateQuestions(text, cardCount);
      } catch (aiErr) {
        if (isAuthError(aiErr as Error)) {
          logger.warn({ err: aiErr }, "AI API auth failed, falling back to offline generator");
          usedOfflineFallback = true;
          sendEvent("status", { message: "AI service unavailable, using offline generator..." });
          questions = offlineGenerator.generateQuestions(text, cardCount);
        } else {
          throw aiErr;
        }
      }
      
      for (const q of questions) {
        cardsToInsert.push({
          deckId: deck.id,
          front: q.front,
          back: q.back,
          tags: null,
          cardType: "mcq",
          choices: q.choices ? JSON.stringify(q.choices) : null,
          correctIndex: q.correctIndex,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        sendEvent("card", {
          front: q.front,
          back: q.back,
          choices: q.choices,
          correctIndex: q.correctIndex,
        });
      }
    } else {
      // Stream flashcard generation
      try {
        for await (const event of aiService.streamGenerateCards(text, cardCount)) {
          if (event.type === "progress") {
            sendEvent("status", event.data);
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
            sendEvent("card", card);
          }
        }
      } catch (aiErr) {
        if (isAuthError(aiErr as Error)) {
          logger.warn({ err: aiErr }, "AI API auth failed, falling back to offline generator");
          usedOfflineFallback = true;
          sendEvent("status", { message: "AI service unavailable, using offline generator..." });
          
          // Fall back to offline streaming
          for await (const event of offlineGenerator.streamGenerateCards(text, cardCount)) {
            if (event.type === "progress") {
              sendEvent("status", event.data);
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
              sendEvent("card", card);
            }
          }
        } else {
          throw aiErr;
        }
      }
    }
    
    // Insert all cards (without explanations)
    const createdCards = await db.insert(cards).values(cardsToInsert).returning();
    
    const duration = Date.now() - startTime;
    await logGeneration(
      userId, 
      deckType, 
      usedOfflineFallback ? "offline-fallback" : model, 
      true, 
      undefined, 
      undefined, 
      undefined, 
      duration
    );
    
    sendEvent("complete", {
      deck,
      cards: createdCards,
      generationId: deck.id,
      duration,
      usedOfflineFallback,
      message: "Cards generated. Use /explanations/generate/:deckId for study explanations.",
    });
    
    res.end();
  } catch (err) {
    const duration = Date.now() - startTime;
    await logGeneration(userId, deckType, model, false, (err as Error).message, undefined, undefined, duration);
    
    logger.error({ err }, "Stream generation failed");
    
    const isAuth = isAuthError(err as Error);
    sendEvent("error", { 
      message: isAuth 
        ? "AI service authentication failed. Using offline mode."
        : "Generation failed. Please try again.",
      code: isAuth ? "AUTH_ERROR" : "GENERATION_ERROR",
    });
    res.end();
  }
});

export default router;
