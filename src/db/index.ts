import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export type DB = DrizzleD1Database<typeof schema>;

export function createDb(d1: D1Database): DB {
  return drizzle(d1, { schema });
}

export const {
  users, sessions, decks, cards, qbanks, questions,
  mindMaps, topics, feedback, generationLogs, freeTierUsage,
  agentSessions, terminalSessions, auditLogs, errorLogs,
  studyPlans, studySessions, studyPlanTemplates, notifications,
  studyExams, studyPlanInstances,
  cardProgress, tags, deckTags, qbankTags,
  achievements, userSettings, milestoneAcknowledgments,
  emailVerificationTokens, passwordResetTokens,
  chatMessages, agentUsage, exams, groupStudyRooms,
  supportKnowledge, supportConversations, supportMessages,
  agentKnowledge, agentResponseCache, agentCacheAnalytics,
  articleJobs, summaries, studypilotPlans,
  libraryDecks, libraryCards,
} = schema;

export * as schemaModule from "./schema";
