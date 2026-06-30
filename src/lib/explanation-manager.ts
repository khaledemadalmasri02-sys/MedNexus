import { db, cards } from "../db/index.js";
import { eq, and, isNull } from "drizzle-orm";
import { generateAllExplanations } from "./explanation-generator.js";
import { logger } from "./logger.js";

// Progress tracking for explanation generation
interface GenerationProgress {
  deckId: number;
  total: number;
  completed: number;
  failed: number;
  status: "idle" | "running" | "completed" | "failed";
  currentCard?: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

// In-memory store for progress (could be moved to Redis for production)
const progressStore = new Map<number, GenerationProgress>();

// Configuration
const CHUNK_SIZE = 50; // Process 50 cards in parallel
const DELAY_BETWEEN_CHUNKS = 0; // No delay — rate limiting handled by retry logic

/**
 * Get progress for a deck's explanation generation
 */
export function getProgress(deckId: number): GenerationProgress | null {
  return progressStore.get(deckId) || null;
}

/**
 * Get all active generations
 */
export function getAllProgress(): GenerationProgress[] {
  return Array.from(progressStore.values());
}

/**
 * Process a single chunk of cards in parallel
 */
async function processChunk(
  chunk: Array<{ id: number; front: string; back: string }>,
  deckId: number,
  progress: GenerationProgress
): Promise<void> {
  // Process all cards in the chunk in parallel
  const promises = chunk.map(async (card) => {
    try {
      // Generate all explanations for this card
      const explanations = await generateAllExplanations(card.front, card.back);

      // Update card with explanations
      await db.update(cards)
        .set({
          explanationFull: explanations.full,
          explanationRevision: explanations.revision,
          explanationOsce: explanations.osce,
          explanationBrief: explanations.brief,
          explanationMnemonic: explanations.mnemonic,
          explanationClinical: explanations.clinical,
          explanationTesttrap: explanations.testtrap,
          explanationsGeneratedAt: new Date(),
        })
        .where(eq(cards.id, card.id));

      progress.completed++;
      logger.info(
        { deckId, cardId: card.id, progress: `${progress.completed}/${progress.total}` },
        "Generated explanations for card"
      );
    } catch (err) {
      progress.failed++;
      logger.error(
        { err, deckId, cardId: card.id },
        "Failed to generate explanations for card"
      );
    }
  });

  // Wait for all cards in the chunk to complete
  await Promise.all(promises);

  // Update progress in store
  progressStore.set(deckId, { ...progress });
}

/**
 * Generate explanations for all cards in a deck using parallel chunk processing
 * This runs in the background and updates progress
 */
export async function generateExplanationsForDeck(deckId: number): Promise<void> {
  // Check if already running
  const existing = progressStore.get(deckId);
  if (existing?.status === "running") {
    logger.info({ deckId }, "Explanation generation already running");
    return;
  }

  // Initialize progress
  const progress: GenerationProgress = {
    deckId,
    total: 0,
    completed: 0,
    failed: 0,
    status: "running",
    startedAt: new Date(),
  };
  progressStore.set(deckId, progress);

  try {
    // Get all cards without explanations
    const cardsWithoutExplanations = await db.query.cards.findMany({
      where: and(
        eq(cards.deckId, deckId),
        isNull(cards.explanationFull)
      ),
    });

    progress.total = cardsWithoutExplanations.length;
    logger.info({ deckId, total: progress.total, chunkSize: CHUNK_SIZE }, "Starting explanation generation");

    if (cardsWithoutExplanations.length === 0) {
      progress.status = "completed";
      progress.completedAt = new Date();
      return;
    }

    // Split cards into chunks
    const chunks: Array<Array<{ id: number; front: string; back: string }>> = [];
    for (let i = 0; i < cardsWithoutExplanations.length; i += CHUNK_SIZE) {
      chunks.push(
        cardsWithoutExplanations.slice(i, i + CHUNK_SIZE).map(card => ({
          id: card.id,
          front: card.front,
          back: card.back,
        }))
      );
    }

    logger.info({ deckId, chunkCount: chunks.length }, "Processing chunks");

    // Process each chunk
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      progress.currentCard = chunkIndex * CHUNK_SIZE + 1;
      
      logger.info(
        { deckId, chunk: chunkIndex + 1, totalChunks: chunks.length, cardsInChunk: chunk.length },
        "Processing chunk"
      );

      // Process chunk in parallel
      await processChunk(chunk, deckId, progress);
    }

    // Mark as completed
    progress.status = "completed";
    progress.completedAt = new Date();
    logger.info(
      { deckId, completed: progress.completed, failed: progress.failed },
      "Explanation generation completed"
    );
  } catch (err) {
    progress.status = "failed";
    progress.error = (err as Error).message;
    progress.completedAt = new Date();
    logger.error({ err, deckId }, "Explanation generation failed");
  }

  progressStore.set(deckId, progress);
}

/**
 * Check if a deck has cards without explanations
 */
export async function hasCardsWithoutExplanations(deckId: number): Promise<boolean> {
  const result = await db.query.cards.findFirst({
    where: and(
      eq(cards.deckId, deckId),
      isNull(cards.explanationFull)
    ),
  });
  return !!result;
}

/**
 * Get count of cards with and without explanations
 */
export async function getExplanationStats(deckId: number): Promise<{
  total: number;
  withExplanations: number;
  withoutExplanations: number;
}> {
  const allCards = await db.query.cards.findMany({
    where: eq(cards.deckId, deckId),
  });

  const withExplanations = allCards.filter(c => c.explanationFull).length;
  
  return {
    total: allCards.length,
    withExplanations,
    withoutExplanations: allCards.length - withExplanations,
  };
}
