import { uuid, timestamp, varchar, text, json, real, integer, boolean, pgTable, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const roles = pgTable("roles", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const universities = pgTable("universities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  country: varchar("country"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const specialties = pgTable("specialties", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const osceUsers = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  passwordHash: text("password_hash"),
  role: varchar("role"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const studentProfiles = pgTable("student_profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().unique().references(() => osceUsers.id, { onDelete: "cascade" }),
  universityId: uuid("university_id").references(() => universities.id),
  yearOfStudy: varchar("year_of_study"),
  specialtyInterest: varchar("specialty_interest"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const facultyProfiles = pgTable("faculty_profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().unique().references(() => osceUsers.id, { onDelete: "cascade" }),
  universityId: uuid("university_id").references(() => universities.id),
  department: varchar("department"),
  specialty: varchar("specialty"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const stationTypes = pgTable("station_types", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  icon: varchar("icon"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const osceStations = pgTable("osce_stations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  specialtyId: uuid("specialty_id").notNull().references(() => specialties.id),
  stationTypeId: uuid("station_type_id").notNull().references(() => stationTypes.id),
  difficulty: varchar("difficulty").notNull().default("medium"),
  duration: integer("duration").notNull(),
  instructions: text("instructions"),
  learningObjectives: json("learning_objectives").notNull().default(sql`'[]'::jsonb`),
  status: varchar("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const stationVersions = pgTable("station_versions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  stationId: uuid("station_id").notNull().references(() => osceStations.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  content: json("content"),
  createdById: uuid("created_by").references(() => osceUsers.id),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  stationId: uuid("station_id").notNull().references(() => osceStations.id, { onDelete: "cascade" }),
  name: varchar("name"),
  age: integer("age"),
  gender: varchar("gender"),
  occupation: varchar("occupation"),
  personality: varchar("personality"),
  communicationStyle: varchar("communication_style"),
});

export const patientConditions = pgTable("patient_conditions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  condition: varchar("condition").notNull(),
  status: varchar("status").notNull().default("active"),
});

export const patientHiddenData = pgTable("patient_hidden_data", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  category: varchar("category").notNull(),
  information: text("information").notNull(),
  importance: varchar("importance").notNull().default("medium"),
});

export const clinicalFindings = pgTable("clinical_findings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  system: varchar("system"),
  finding: varchar("finding"),
  triggerCondition: varchar("trigger_condition"),
});

export const rubrics = pgTable("rubrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  stationId: uuid("station_id").notNull().references(() => osceStations.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  weight: real("weight").notNull().default(1.0),
});

export const rubricItems = pgTable("rubric_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  rubricId: uuid("rubric_id").notNull().references(() => rubrics.id, { onDelete: "cascade" }),
  criterion: varchar("criterion").notNull(),
  points: integer("points").notNull(),
  critical: boolean("critical").notNull().default(false),
});

export const osceSessions = pgTable("osce_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => osceUsers.id),
  stationId: uuid("station_id").notNull().references(() => osceStations.id),
  startedAt: timestamp("started_at").notNull().default(sql`NOW()`),
  endedAt: timestamp("ended_at"),
  status: varchar("status").notNull().default("created"),
});

export const conversationMessages = pgTable("conversation_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").notNull().references(() => osceSessions.id, { onDelete: "cascade" }),
  speaker: varchar("speaker").notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").notNull().default(sql`NOW()`),
});

export const aiEvents = pgTable("ai_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").notNull().references(() => osceSessions.id, { onDelete: "cascade" }),
  agent: varchar("agent").notNull(),
  input: json("input"),
  output: json("output"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const osceScores = pgTable("osce_scores", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").notNull().references(() => osceSessions.id, { onDelete: "cascade" }),
  totalScore: real("total_score"),
  passStatus: boolean("pass_status").default(false),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const scoreComponents = pgTable("score_components", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  scoreId: uuid("score_id").notNull().references(() => osceScores.id, { onDelete: "cascade" }),
  category: varchar("category").notNull(),
  score: real("score").notNull(),
  maxScore: real("max_score").notNull(),
});

export const feedbackReports = pgTable("feedback_reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").notNull().references(() => osceSessions.id, { onDelete: "cascade" }),
  strengths: json("strengths").notNull().default(sql`'[]'::jsonb`),
  weaknesses: json("weaknesses").notNull().default(sql`'[]'::jsonb`),
  recommendations: json("recommendations").notNull().default(sql`'[]'::jsonb`),
});

export const studentSkills = pgTable("student_skills", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => osceUsers.id, { onDelete: "cascade" }),
  skill: varchar("skill").notNull(),
  score: real("score").notNull(),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const studentWeaknesses = pgTable("student_weaknesses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => osceUsers.id, { onDelete: "cascade" }),
  topic: varchar("topic").notNull(),
  frequency: integer("frequency").notNull().default(1),
  priority: varchar("priority").notNull().default("medium"),
});

export const learningRecommendations = pgTable("learning_recommendations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => osceUsers.id, { onDelete: "cascade" }),
  recommendedStationId: uuid("recommended_station_id").notNull().references(() => osceStations.id),
  reason: text("reason").notNull(),
  completed: boolean("completed").notNull().default(false),
});

export const medicalDocuments = pgTable("medical_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  source: varchar("source"),
  type: varchar("type"),
  uploadedById: uuid("uploaded_by").references(() => osceUsers.id),
});

export const documentChunks = pgTable("document_chunks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: uuid("document_id").notNull().references(() => medicalDocuments.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  embedding: text("embedding"),
});

export const stationReviews = pgTable("station_reviews", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  stationId: uuid("station_id").notNull().references(() => osceStations.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewer_id").notNull().references(() => osceUsers.id, { onDelete: "cascade" }),
  status: varchar("status").notNull().default("pending"),
  comments: text("comments"),
});

export const osceProgress = pgTable("osce_progress", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => osceUsers.id, { onDelete: "cascade" }),
  stationId: uuid("station_id").notNull().references(() => osceStations.id, { onDelete: "cascade" }),
  attemptsCount: integer("attempts_count").notNull().default(0),
  bestScore: real("best_score"),
  averageScore: real("average_score"),
  lastAttemptAt: timestamp("last_attempt_at"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const osceExams = pgTable("osce_exams", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => osceUsers.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  stationIds: json("station_ids").notNull().default(sql`'[]'::jsonb`),
  totalTimeMinutes: integer("total_time_minutes").notNull().default(120),
  isMock: boolean("is_mock").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const osceAttempts = pgTable("osce_attempts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => osceUsers.id),
  examId: uuid("exam_id").notNull().references(() => osceExams.id, { onDelete: "cascade" }),
  stationId: uuid("station_id").notNull().references(() => osceStations.id),
  startedAt: timestamp("started_at").notNull().default(sql`NOW()`),
  completedAt: timestamp("completed_at"),
  durationSeconds: integer("duration_seconds"),
  conversationLog: json("conversation_log").default(sql`'[]'::jsonb`),
  score: real("score"),
  scoresByCategory: json("scores_by_category").default(sql`'{}'::jsonb`),
  feedback: json("feedback").default(sql`'{}'::jsonb`),
  strengths: json("strengths").default(sql`'[]'::jsonb`),
  weaknesses: json("weaknesses").default(sql`'[]'::jsonb`),
  improvementPlan: text("improvement_plan"),
  examinerNotes: json("examiner_notes").default(sql`'{}'::jsonb`),
  isCompleted: boolean("is_completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const osceAnalytics = pgTable("osce_analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  stationId: uuid("station_id").notNull().references(() => osceStations.id),
  totalAttempts: integer("total_attempts").notNull().default(0),
  totalCompletions: integer("total_completions").notNull().default(0),
  averageScore: real("average_score").default(0),
  mostFailedCategory: varchar("most_failed_category"),
  weakAreas: json("weak_areas").default(sql`'[]'::jsonb`),
  lastUpdated: timestamp("last_updated").notNull().default(sql`NOW()`),
});

export const osceExamReadiness = pgTable("osce_exam_readiness", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => osceUsers.id).unique(),
  readinessScore: real("readiness_score").notNull(),
  passProbability: varchar("pass_probability").notNull(),
  criticalErrors: integer("critical_errors").notNull().default(0),
  consistencyScore: real("consistency_score").notNull(),
  recentScores: json("recent_scores").notNull().default(sql`'[]'::jsonb`),
  lastCalculated: timestamp("last_calculated").notNull().default(sql`NOW()`),
});

export const osceSpacedRepetition = pgTable("osce_spaced_repetition", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => osceUsers.id, { onDelete: "cascade" }),
  stationId: uuid("station_id").notNull().references(() => osceStations.id, { onDelete: "cascade" }),
  status: varchar("status").notNull().default("pending"),
  nextReviewAt: timestamp("next_review_at"),
  lastReviewedAt: timestamp("last_reviewed_at"),
  easeFactor: real("ease_factor").notNull().default(2.5),
  intervalDays: integer("interval_days").notNull().default(0),
  repetitions: integer("repetitions").notNull().default(0),
  quality: integer("quality"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const osceClinicalHeatmap = pgTable("osce_clinical_heatmap", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => osceUsers.id),
  historyTaking: integer("history_taking").notNull().default(0),
  communication: integer("communication").notNull().default(0),
  clinicalReasoning: integer("clinical_reasoning").notNull().default(0),
  management: integer("management").notNull().default(0),
  emergencyResponse: integer("emergency_response").notNull().default(0),
  professionalSkills: integer("professional_skills").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().default(sql`NOW()`),
});

export const osceConfidenceTracking = pgTable("osce_confidence_tracking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => osceUsers.id),
  attemptId: uuid("attempt_id").notNull().references(() => osceAttempts.id, { onDelete: "cascade" }),
  confidenceRating: integer("confidence_rating").notNull(),
  selfScore: integer("self_score"),
  actualScore: integer("actual_score"),
  calibrationGap: integer("calibration_gap"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const osceProgressTimeline = pgTable("osce_progress_timeline", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => osceUsers.id),
  date: varchar("date").notNull(),
  averageScore: real("average_score"),
  attemptsCount: integer("attempts_count").notNull().default(0),
  stationsPracticed: integer("stations_practiced").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const osceSettings = pgTable("osce_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => osceUsers.id).unique(),
  voiceEnabled: boolean("voice_enabled").notNull().default(true),
  autoSubmitEnabled: boolean("auto_submit_enabled").notNull().default(false),
  showHints: boolean("show_hints").notNull().default(true),
  difficultyFilter: varchar("difficulty_filter").notNull().default("all"),
  preferredStationTypes: json("preferred_station_types").default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export type OsceUser = typeof osceUsers.$inferSelect;
export type NewOsceUser = typeof osceUsers.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type University = typeof universities.$inferSelect;
export type NewUniversity = typeof universities.$inferInsert;
export type Specialty = typeof specialties.$inferSelect;
export type NewSpecialty = typeof specialties.$inferInsert;
export type StudentProfile = typeof studentProfiles.$inferSelect;
export type NewStudentProfile = typeof studentProfiles.$inferInsert;
export type FacultyProfile = typeof facultyProfiles.$inferSelect;
export type NewFacultyProfile = typeof facultyProfiles.$inferInsert;
export type StationType = typeof stationTypes.$inferSelect;
export type NewStationType = typeof stationTypes.$inferInsert;
export type Station = typeof osceStations.$inferSelect;
export type NewStation = typeof osceStations.$inferInsert;
export type StationVersion = typeof stationVersions.$inferSelect;
export type NewStationVersion = typeof stationVersions.$inferInsert;
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type PatientCondition = typeof patientConditions.$inferSelect;
export type NewPatientCondition = typeof patientConditions.$inferInsert;
export type PatientHiddenData = typeof patientHiddenData.$inferSelect;
export type NewPatientHiddenData = typeof patientHiddenData.$inferInsert;
export type ClinicalFinding = typeof clinicalFindings.$inferSelect;
export type NewClinicalFinding = typeof clinicalFindings.$inferInsert;
export type Rubric = typeof rubrics.$inferSelect;
export type NewRubric = typeof rubrics.$inferInsert;
export type RubricItem = typeof rubricItems.$inferSelect;
export type NewRubricItem = typeof rubricItems.$inferInsert;
export type OsceSession = typeof osceSessions.$inferSelect;
export type NewOsceSession = typeof osceSessions.$inferInsert;
export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type NewConversationMessage = typeof conversationMessages.$inferInsert;
export type AiEvent = typeof aiEvents.$inferSelect;
export type NewAiEvent = typeof aiEvents.$inferInsert;
export type OsceScore = typeof osceScores.$inferSelect;
export type NewOsceScore = typeof osceScores.$inferInsert;
export type ScoreComponent = typeof scoreComponents.$inferSelect;
export type NewScoreComponent = typeof scoreComponents.$inferInsert;
export type FeedbackReport = typeof feedbackReports.$inferSelect;
export type NewFeedbackReport = typeof feedbackReports.$inferInsert;
export type StudentSkill = typeof studentSkills.$inferSelect;
export type NewStudentSkill = typeof studentSkills.$inferInsert;
export type StudentWeakness = typeof studentWeaknesses.$inferSelect;
export type NewStudentWeakness = typeof studentWeaknesses.$inferInsert;
export type LearningRecommendation = typeof learningRecommendations.$inferSelect;
export type NewLearningRecommendation = typeof learningRecommendations.$inferInsert;
export type MedicalDocument = typeof medicalDocuments.$inferSelect;
export type NewMedicalDocument = typeof medicalDocuments.$inferInsert;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;
export type StationReview = typeof stationReviews.$inferSelect;
export type NewStationReview = typeof stationReviews.$inferInsert;
export type OsceProgress = typeof osceProgress.$inferSelect;
export type NewOsceProgress = typeof osceProgress.$inferInsert;
export type OsceExam = typeof osceExams.$inferSelect;
export type NewOsceExam = typeof osceExams.$inferInsert;
export type OsceAttempt = typeof osceAttempts.$inferSelect;
export type NewOsceAttempt = typeof osceAttempts.$inferInsert;
export type OsceAnalytics = typeof osceAnalytics.$inferSelect;
export type NewOsceAnalytics = typeof osceAnalytics.$inferInsert;
export type OsceExamReadiness = typeof osceExamReadiness.$inferSelect;
export type NewOsceExamReadiness = typeof osceExamReadiness.$inferInsert;
export type OsceSpacedRepetition = typeof osceSpacedRepetition.$inferSelect;
export type NewOsceSpacedRepetition = typeof osceSpacedRepetition.$inferInsert;
export type OsceClinicalHeatmap = typeof osceClinicalHeatmap.$inferSelect;
export type NewOsceClinicalHeatmap = typeof osceClinicalHeatmap.$inferInsert;
export type OsceConfidenceTracking = typeof osceConfidenceTracking.$inferSelect;
export type NewOsceConfidenceTracking = typeof osceConfidenceTracking.$inferInsert;
export type OsceProgressTimeline = typeof osceProgressTimeline.$inferSelect;
export type NewOsceProgressTimeline = typeof osceProgressTimeline.$inferInsert;
export type OsceSettings = typeof osceSettings.$inferSelect;
export type NewOsceSettings = typeof osceSettings.$inferInsert;