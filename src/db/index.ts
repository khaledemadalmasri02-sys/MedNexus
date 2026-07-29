import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";
import * as osceSchema from "./schema-osce";

export type DB = DrizzleD1Database<typeof schema>;
export type OsceDB = DrizzleD1Database<typeof osceSchema>;

export function createDb(d1: D1Database): DB {
  return drizzle(d1, { schema });
}

export function createOsceDb(d1: D1Database): OsceDB {
  return drizzle(d1, { schema: osceSchema });
}

export function createFlashcardDb(d1: D1Database) {
  return drizzle(d1, { schema: { ...schema } });
}

export function createStudyPilotDb(d1: D1Database) {
  return drizzle(d1, { schema: { ...schema } });
}

export const {
  users, sessions,
  decks, cards, qbanks, questions,
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
  articleJobs, generationJobs, summaries, studypilotPlans,
  libraryDecks, libraryCards,
  knowledgeGraphNodes, knowledgeGraphEdges, cardMetadata, explanationCache, batchJobs,
} = schema;

export const {
  specialties, stationTypes, stations, difficultyFactors, stationVersions,
  patientProfiles, hiddenClinicalInfo, stationPatients, osceExams,
  osceAttempts, scoringCriteria, attemptResponses, osceProgress, osceSettings,
  osceAnalytics, competencyProfile, skillRecommendations,
  studentLearningProfiles, osceConfidenceTracking, osceProgressTimeline,
  osceExamReadiness, osceSpacedRepetition, osceClinicalHeatmap,
  osceKnowledgeDetection, oscePracticePlan,
} = osceSchema;

export type {
  Specialty, NewSpecialty,
  StationType, NewStationType,
  Station, NewStation,
  DifficultyFactors, NewDifficultyFactors,
  StationVersion, NewStationVersion,
  PatientProfile, NewPatientProfile,
  StationPatient, NewStationPatient,
  OsceExam, NewOsceExam,
  OsceAttempt, NewOsceAttempt,
  ScoringCriterion, NewScoringCriterion,
  AttemptResponse, NewAttemptResponse,
  OsceProgress, NewOsceProgress,
  OsceSettings, NewOsceSettings,
  OsceAnalytics, NewOsceAnalytics,
  CompetencyProfile, NewCompetencyProfile,
  SkillRecommendation, NewSkillRecommendation,
  StudentLearningProfile, NewStudentLearningProfile,
  OsceConfidenceTracking, NewOsceConfidenceTracking,
  OsceProgressTimeline, NewOsceProgressTimeline,
  OsceExamReadiness, NewOsceExamReadiness,
  OsceSpacedRepetition, NewOsceSpacedRepetition,
  OsceClinicalHeatmap, NewOsceClinicalHeatmap,
  OsceKnowledgeDetection, NewOsceKnowledgeDetection,
  OscePracticePlan, NewOscePracticePlan,
} from "./schema-osce.js";

export type FlashcardDB = DB;
export type StudyPilotDB = DB;

export * as schemaModule from "./schema";
export * as flashcardSchemaModule from "./schema-flashcard";
export * as studyPilotSchemaModule from "./schema-study-pilot";
export * as osceSchemaModule from "./schema-osce";