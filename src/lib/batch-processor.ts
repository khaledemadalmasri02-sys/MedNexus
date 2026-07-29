import { type Card } from "../db/schema";
import { type GeneratedCard, AIService } from "./ai";
import { createSimilarityService } from "./similarity";
import { createCardQualityService } from "./card-quality";
import { createDifficultyClassifier } from "./difficulty";
import { logger } from "./logger";

export interface BatchJobStatus {
  id: string;
  type: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  totalItems: number;
  completedItems: number;
  error?: string;
  result?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchProcessOptions {
  concurrency?: number;
  skipDuplicates?: boolean;
  qualityCheck?: boolean;
  autoClassifyDifficulty?: boolean;
}

export class BatchProcessor {
  private aiService: AIService;
  private similarityService = createSimilarityService();
  private qualityService = createCardQualityService();
  private difficultyClassifier = createDifficultyClassifier();

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  async processTextBatch(
    texts: string[],
    deckName: string,
    options: BatchProcessOptions = {}
  ): Promise<{ cards: GeneratedCard[]; jobId: string }> {
    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const concurrency = options.concurrency || 5;
    const processedCards: GeneratedCard[] = [];

    for (let i = 0; i < texts.length; i += concurrency) {
      const batch = texts.slice(i, i + concurrency);

      await Promise.all(batch.map(async (text, idx) => {
        try {
          const cards = await this.aiService.generateCards(text, 10, {
            concurrency: 1,
          });

          if (options.qualityCheck) {
            cards.forEach((card) => {
              const quality = this.qualityService.validateCard(card.front, card.back);
              if (!quality.passed) {
                logger.warn({ cardId: card.front.substring(0, 30), issues: quality.issues }, "Quality check failed for card");
              }
            });
          }

          if (options.autoClassifyDifficulty) {
            cards.forEach((card) => {
              const result = this.difficultyClassifier.classify(card.front, card.back);
              logger.debug({ cardId: card.front.substring(0, 30), difficulty: result.difficulty }, "Difficulty classification");
            });
          }

          processedCards.push(...cards);
        } catch (err) {
          logger.warn({ err: (err as Error)?.message, batchIndex: i + idx }, "Batch processing failed for text item");
        }
      }));
    }

    return { cards: processedCards, jobId };
  }

  async processExistingCards(
    cards: Card[],
    options: BatchProcessOptions = {}
  ): Promise<{ cards: Card[]; duplicates: Card[][] }> {
    const duplicates: Card[][] = [];
    const uniqueCards: Card[] = [];
    const similarityThreshold = 0.85;

    for (const card of cards) {
      let isDuplicate = false;
      for (const existingCard of uniqueCards) {
        const text = `${card.front} ${card.back}`;
        const existingText = `${existingCard.front} ${existingCard.back}`;
        const similarity = this.similarityService.semanticSimilarity(text, existingText);

        if (similarity >= similarityThreshold) {
          const existingDupes = duplicates.find((d) =>
            d.some((c) => c.id === existingCard.id)
          );
          if (existingDupes) {
            existingDupes.push(card);
          } else {
            const cardDupes = [existingCard, card];
            duplicates.push(cardDupes);
          }
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        uniqueCards.push(card);
      }
    }

    return { cards: uniqueCards, duplicates };
  }

  async generateBatch(
    texts: string[],
    options: BatchProcessOptions = {}
  ): Promise<{
    totalCards: number;
    cards: GeneratedCard[];
    qualityScores: number[];
    difficulties: string[];
  }> {
    const { cards, jobId } = await this.processTextBatch(texts, "Batch Generated", options);

    const qualityScores: number[] = [];
    const difficulties: string[] = [];

    cards.forEach((card) => {
      const quality = this.qualityService.validateCard(card.front, card.back);
      qualityScores.push(quality.score);

      const result = this.difficultyClassifier.classify(card.front, card.back);
      difficulties.push(result.difficulty);
    });

    return {
      totalCards: cards.length,
      cards,
      qualityScores,
      difficulties,
    };
  }

  async findAndResolveDuplicates(cards: Card[]): Promise<{
    uniqueCards: Card[];
    mergedCards: Array<{ primary: Card; duplicates: Card[] }>;
  }> {
    const similarityThreshold = 0.85;
    const uniqueCards: Card[] = [];
    const mergedCards: Array<{ primary: Card; duplicates: Card[] }> = [];
    const processedIds = new Set<number>();

    for (let i = 0; i < cards.length; i++) {
      if (processedIds.has(cards[i].id)) continue;

      const card = cards[i];
      const duplicates: Card[] = [];

      for (let j = i + 1; j < cards.length; j++) {
        if (processedIds.has(cards[j].id)) continue;

        const text = `${card.front} ${card.back}`;
        const otherText = `${cards[j].front} ${cards[j].back}`;
        const similarity = this.similarityService.semanticSimilarity(text, otherText);

        if (similarity >= similarityThreshold) {
          duplicates.push(cards[j]);
          processedIds.add(cards[j].id);
        }
      }

      processedIds.add(card.id);

      if (duplicates.length > 0) {
        mergedCards.push({ primary: card, duplicates });
        uniqueCards.push(card);
      } else {
        uniqueCards.push(card);
      }
    }

    return { uniqueCards, mergedCards };
  }
}

export function createBatchProcessor(aiService: AIService): BatchProcessor {
  return new BatchProcessor(aiService);
}