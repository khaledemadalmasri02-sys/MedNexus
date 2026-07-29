import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export type FlashcardDB = DrizzleD1Database<typeof schema>;

export function createFlashcardDb(d1: D1Database): FlashcardDB {
  return drizzle(d1, { schema });
}

export const {
  decks, cards, qbanks, questions,
  mindMaps, topics, feedback, freeTierUsage,
  cardProgress, tags, deckTags, qbankTags,
  exams, groupStudyRooms,
  users, sessions,
} = schema;

export * as flashcardSchema from "./schema-flashcard";