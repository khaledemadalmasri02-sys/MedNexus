import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./schema";

export const specialties = sqliteTable("osce_specialties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type Specialty = typeof specialties.$inferSelect;
export type NewSpecialty = typeof specialties.$inferInsert;

export const stationTypes = sqliteTable("osce_station_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type StationType = typeof stationTypes.$inferSelect;
export type NewStationType = typeof stationTypes.$inferInsert;

export const stations = sqliteTable("osce_stations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  specialtyId: integer("specialty_id").notNull().references(() => specialties.id),
  subspecialty: text("subspecialty"),
  stationTypeId: integer("station_type_id").notNull().references(() => stationTypes.id),
  difficulty: text("difficulty").notNull().default("medium"),
  difficultyLevel: integer("difficulty_level").notNull().default(3),
  duration: integer("duration").notNull(),
  status: text("status").notNull().default("draft"),
  candidateInstructions: text("candidate_instructions").notNull(),
  patientInstructions: text("patient_instructions").notNull(),
  hiddenDiagnosis: text("hidden_diagnosis"),
  expectedQuestions: text("expected_questions").default("[]"),
  expectedFindings: text("expected_findings").default("[]"),
  markingScheme: text("marking_scheme").notNull().default("{}"),
  learningObjectives: text("learning_objectives").default("[]"),
  references: text("references").default("[]"),
  clinicalPathway: text("clinical_pathway").default("[]"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  createdByUserId: text("created_by_user_id").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type Station = typeof stations.$inferSelect;
export type NewStation = typeof stations.$inferInsert;

export const difficultyFactors = sqliteTable("osce_difficulty_factors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stationId: integer("station_id").notNull().references(() => stations.id, { onDelete: "cascade" }),
  patientComplexity: integer("patient_complexity").notNull().default(3),
  communicationDifficulty: integer("communication_difficulty").notNull().default(3),
  timePressure: integer("time_pressure").notNull().default(2),
  clinicalReasoning: integer("clinical_reasoning").notNull().default(3),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type DifficultyFactors = typeof difficultyFactors.$inferSelect;
export type NewDifficultyFactors = typeof difficultyFactors.$inferInsert;

export const stationVersions = sqliteTable("osce_station_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stationId: integer("station_id").notNull().references(() => stations.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  createdByUserId: text("created_by_user_id").references(() => users.id),
  changeNotes: text("change_notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type StationVersion = typeof stationVersions.$inferSelect;
export type NewStationVersion = typeof stationVersions.$inferInsert;

export const patientProfiles = sqliteTable("osce_patient_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  occupation: text("occupation"),
  personality: text("personality").notNull(),
  communicationStyle: text("communication_style").notNull(),
  emotionalState: text("emotional_state").notNull().default("neutral"),
  background: text("background"),
  medicalHistory: text("medical_history").default("[]"),
  medications: text("medications").default("[]"),
  allergies: text("allergies").default("[]"),
  familyHistory: text("family_history").default("[]"),
  socialHistory: text("social_history").default("[]"),
  hearingDifficulty: integer("hearing_difficulty", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type PatientProfile = typeof patientProfiles.$inferSelect;
export type NewPatientProfile = typeof patientProfiles.$inferInsert;

export const hiddenClinicalInfo = sqliteTable("osce_hidden_clinical_info", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientProfileId: integer("patient_profile_id").notNull().references(() => patientProfiles.id, { onDelete: "cascade" }),
  diagnosis: text("diagnosis"),
  symptoms: text("symptoms").default("{}"),
  riskFactors: text("risk_factors").default("[]"),
  redFlags: text("red_flags").default("[]"),
  vitalSigns: text("vital_signs").default("{}"),
  painDescription: text("pain_description"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type HiddenClinicalInfo = typeof hiddenClinicalInfo.$inferSelect;
export type NewHiddenClinicalInfo = typeof hiddenClinicalInfo.$inferInsert;

export const stationPatients = sqliteTable("osce_station_patients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stationId: integer("station_id").notNull().references(() => stations.id, { onDelete: "cascade" }),
  patientProfileId: integer("patient_profile_id").notNull().references(() => patientProfiles.id),
  scenarioVariants: text("scenario_variants").default("[]"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type StationPatient = typeof stationPatients.$inferSelect;
export type NewStationPatient = typeof stationPatients.$inferInsert;

export const osceExams = sqliteTable("osce_exams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  stationIds: text("station_ids").notNull().default("[]"),
  totalTimeMinutes: integer("total_time_minutes").notNull().default(120),
  isMock: integer("is_mock", { mode: "boolean" }).notNull().default(false),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type OsceExam = typeof osceExams.$inferSelect;
export type NewOsceExam = typeof osceExams.$inferInsert;

export const osceAttempts = sqliteTable("osce_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  examId: integer("exam_id").notNull().references(() => osceExams.id, { onDelete: "cascade" }),
  stationId: integer("station_id").notNull().references(() => stations.id),
  patientProfileId: integer("patient_profile_id").notNull().references(() => patientProfiles.id),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  durationSeconds: integer("duration_seconds"),
  conversationLog: text("conversation_log").default("[]"),
  score: real("score"),
  scoresByCategory: text("scores_by_category").default("{}"),
  feedback: text("feedback").default("{}"),
  strengths: text("strengths").default("[]"),
  weaknesses: text("weaknesses").default("[]"),
  improvementPlan: text("improvement_plan"),
  examinerNotes: text("examiner_notes").default("{}"),
  isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type OsceAttempt = typeof osceAttempts.$inferSelect;
export type NewOsceAttempt = typeof osceAttempts.$inferInsert;

export const scoringCriteria = sqliteTable("osce_scoring_criteria", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stationId: integer("station_id").notNull().references(() => stations.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  subCategory: text("sub_category"),
  maxPoints: integer("max_points").notNull(),
  description: text("description").notNull(),
  criteriaOrder: integer("criteria_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type ScoringCriterion = typeof scoringCriteria.$inferSelect;
export type NewScoringCriterion = typeof scoringCriteria.$inferInsert;

export const attemptResponses = sqliteTable("osce_attempt_responses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  attemptId: integer("attempt_id").notNull().references(() => osceAttempts.id, { onDelete: "cascade" }),
  criterionId: integer("criterion_id").references(() => scoringCriteria.id),
  questionAsked: text("question_asked"),
  patientResponse: text("patient_response"),
  pointsAwarded: integer("points_awarded"),
  feedback: text("feedback"),
  isMissed: integer("is_missed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type AttemptResponse = typeof attemptResponses.$inferSelect;
export type NewAttemptResponse = typeof attemptResponses.$inferInsert;

export const osceProgress = sqliteTable("osce_progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  stationId: integer("station_id").notNull().references(() => stations.id),
  attemptsCount: integer("attempts_count").notNull().default(0),
  bestScore: real("best_score"),
  averageScore: real("average_score"),
  lastAttemptAt: integer("last_attempt_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type OsceProgress = typeof osceProgress.$inferSelect;
export type NewOsceProgress = typeof osceProgress.$inferInsert;

export const osceSettings = sqliteTable("osce_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id).unique(),
  voiceEnabled: integer("voice_enabled", { mode: "boolean" }).notNull().default(true),
  autoSubmitEnabled: integer("auto_submit_enabled", { mode: "boolean" }).notNull().default(false),
  showHints: integer("show_hints", { mode: "boolean" }).notNull().default(true),
  difficultyFilter: text("difficulty_filter").notNull().default("all"),
  preferredStationTypes: text("preferred_station_types").default("[]"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type OsceSettings = typeof osceSettings.$inferSelect;
export type NewOsceSettings = typeof osceSettings.$inferInsert;

export const osceAnalytics = sqliteTable("osce_analytics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stationId: integer("station_id").notNull().references(() => stations.id),
  totalAttempts: integer("total_attempts").notNull().default(0),
  totalCompletions: integer("total_completions").notNull().default(0),
  averageScore: real("average_score").default(0),
  mostFailedCategory: text("most_failed_category"),
  weakAreas: text("weak_areas").default("[]"),
  lastUpdated: integer("last_updated", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type OsceAnalytics = typeof osceAnalytics.$inferSelect;
export type NewOsceAnalytics = typeof osceAnalytics.$inferInsert;

export const stationWeights = sqliteTable("osce_station_weights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stationId: integer("station_id").notNull().references(() => stations.id, { onDelete: "cascade" }),
  communication: integer("communication").notNull().default(20),
  history: integer("history").notNull().default(30),
  clinicalReasoning: integer("clinical_reasoning").notNull().default(20),
  management: integer("management").notNull().default(20),
  professionalism: integer("professionalism").notNull().default(10),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type StationWeight = typeof stationWeights.$inferSelect;
export type NewStationWeight = typeof stationWeights.$inferInsert;

export const failConditions = sqliteTable("osce_fail_conditions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stationId: integer("station_id").notNull().references(() => stations.id, { onDelete: "cascade" }),
  condition: text("condition").notNull(),
  severity: text("severity").notNull().default("critical"),
  pointsDeducted: integer("points_deducted").notNull().default(10),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type FailCondition = typeof failConditions.$inferSelect;
export type NewFailCondition = typeof failConditions.$inferInsert;

export const criticalPatterns = sqliteTable("osce_critical_patterns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stationId: integer("station_id").notNull().references(() => stations.id, { onDelete: "cascade" }),
  pattern: text("pattern").notNull(),
  description: text("description"),
  severity: text("severity").notNull().default("critical"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type CriticalPattern = typeof criticalPatterns.$inferSelect;
export type NewCriticalPattern = typeof criticalPatterns.$inferInsert;

export const competencyProfile = sqliteTable("osce_competency_profile", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  communication: integer("communication").notNull().default(0),
  history: integer("history").notNull().default(0),
  clinicalReasoning: integer("clinical_reasoning").notNull().default(0),
  management: integer("management").notNull().default(0),
  professionalism: integer("professionalism").notNull().default(0),
  emergencyManagement: integer("emergency_management").notNull().default(0),
  lastUpdated: integer("last_updated", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type CompetencyProfile = typeof competencyProfile.$inferSelect;
export type NewCompetencyProfile = typeof competencyProfile.$inferInsert;

export const skillRecommendations = sqliteTable("osce_skill_recommendations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  stationId: integer("station_id").notNull().references(() => stations.id),
  reason: text("reason").notNull(),
  priority: text("priority").notNull().default("medium"),
  isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type SkillRecommendation = typeof skillRecommendations.$inferSelect;
export type NewSkillRecommendation = typeof skillRecommendations.$inferInsert;

export const studentLearningProfiles = sqliteTable("osce_student_learning_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id).unique(),
  clinicalSkills: text("clinical_skills").notNull().default("{}"),
  communicationSkills: text("communication_skills").notNull().default("{}"),
  historySkills: text("history_skills").notNull().default("{}"),
  clinicalReasoning: integer("clinical_reasoning").notNull().default(0),
  management: integer("management").notNull().default(0),
  emergencyResponse: integer("emergency_response").notNull().default(0),
  professionalSkills: integer("professional_skills").notNull().default(0),
  weakTopics: text("weak_topics").notNull().default("[]"),
  strengths: text("strengths").notNull().default("[]"),
  lastUpdated: integer("last_updated", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type StudentLearningProfile = typeof studentLearningProfiles.$inferSelect;
export type NewStudentLearningProfile = typeof studentLearningProfiles.$inferInsert;

export const osceConfidenceTracking = sqliteTable("osce_confidence_tracking", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  attemptId: integer("attempt_id").notNull().references(() => osceAttempts.id, { onDelete: "cascade" }),
  confidenceRating: integer("confidence_rating").notNull(),
  selfScore: integer("self_score"),
  actualScore: integer("actual_score"),
  calibrationGap: integer("calibration_gap"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type OsceConfidenceTracking = typeof osceConfidenceTracking.$inferSelect;
export type NewOsceConfidenceTracking = typeof osceConfidenceTracking.$inferInsert;

export const osceProgressTimeline = sqliteTable("osce_progress_timeline", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  date: text("date").notNull(),
  averageScore: real("average_score"),
  attemptsCount: integer("attempts_count").notNull().default(0),
  stationsPracticed: integer("stations_practiced").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type OsceProgressTimeline = typeof osceProgressTimeline.$inferSelect;
export type NewOsceProgressTimeline = typeof osceProgressTimeline.$inferInsert;

export const osceExamReadiness = sqliteTable("osce_exam_readiness", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id).unique(),
  readinessScore: real("readiness_score").notNull(),
  passProbability: text("pass_probability").notNull(),
  criticalErrors: integer("critical_errors").notNull().default(0),
  consistencyScore: real("consistency_score").notNull(),
  recentScores: text("recent_scores").notNull().default("[]"),
  lastCalculated: integer("last_calculated", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type OsceExamReadiness = typeof osceExamReadiness.$inferSelect;
export type NewOsceExamReadiness = typeof osceExamReadiness.$inferInsert;

export const osceSpacedRepetition = sqliteTable("osce_spaced_repetition", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  stationId: integer("station_id").notNull().references(() => stations.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  nextReviewAt: integer("next_review_at", { mode: "timestamp_ms" }),
  lastReviewedAt: integer("last_reviewed_at", { mode: "timestamp_ms" }),
  easeFactor: real("ease_factor").notNull().default(2.5),
  intervalDays: integer("interval_days").notNull().default(0),
  repetitions: integer("repetitions").notNull().default(0),
  quality: integer("quality"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type OsceSpacedRepetition = typeof osceSpacedRepetition.$inferSelect;
export type NewOsceSpacedRepetition = typeof osceSpacedRepetition.$inferInsert;

export const osceClinicalHeatmap = sqliteTable("osce_clinical_heatmap", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  historyTaking: integer("history_taking").notNull().default(0),
  communication: integer("communication").notNull().default(0),
  clinicalReasoning: integer("clinical_reasoning").notNull().default(0),
  management: integer("management").notNull().default(0),
  emergencyResponse: integer("emergency_response").notNull().default(0),
  professionalSkills: integer("professional_skills").notNull().default(0),
  lastUpdated: integer("last_updated", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type OsceClinicalHeatmap = typeof osceClinicalHeatmap.$inferSelect;
export type NewOsceClinicalHeatmap = typeof osceClinicalHeatmap.$inferInsert;

export const osceKnowledgeDetection = sqliteTable("osce_knowledge_detection", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  stationId: integer("station_id").notNull().references(() => stations.id),
  knowledgeDeficit: text("knowledge_deficit").notNull().default("none"),
  skillDeficit: text("skill_deficit").notNull().default("none"),
  relatedFlashcards: text("related_flashcards").notNull().default("[]"),
  relatedQuestions: text("related_questions").notNull().default("[]"),
  detectedAt: integer("detected_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type OsceKnowledgeDetection = typeof osceKnowledgeDetection.$inferSelect;
export type NewOsceKnowledgeDetection = typeof osceKnowledgeDetection.$inferInsert;

export const oscePracticePlan = sqliteTable("osce_practice_plan", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  dayNumber: integer("day_number").notNull(),
  stations: text("stations").notNull().default("[]"),
  focusAreas: text("focus_areas").notNull().default("[]"),
  difficultyLevel: text("difficulty_level").notNull().default("medium"),
  generatedAt: integer("generated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
});

export type OscePracticePlan = typeof oscePracticePlan.$inferSelect;
export type NewOscePracticePlan = typeof oscePracticePlan.$inferInsert;