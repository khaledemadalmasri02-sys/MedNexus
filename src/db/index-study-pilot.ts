import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export type StudyPilotDB = DrizzleD1Database<typeof schema>;

export function createStudyPilotDb(d1: D1Database): StudyPilotDB {
  return drizzle(d1, { schema });
}

export const {
  studypilotPlans, studyPlans, studySessions, studyPlanInstances,
  studyPlanTemplates, notifications, studyExams,
  libraryDecks, libraryCards, articleJobs, generationJobs, summaries, generationLogs,
  mindMaps, topics,
  users, sessions, decks, cards,
} = schema;

export * as studyPilotSchema from "./schema-study-pilot";