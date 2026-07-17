import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
// Users table
export const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    email: text("email"),
    emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
    firstName: text("first_name"),
    lastName: text("last_name"),
    profileImageUrl: text("profile_image_url"),
    isPro: integer("is_pro", { mode: "boolean" }).default(false),
    authProvider: text("auth_provider").default("local"),
    oauthProviderId: text("oauth_provider_id"),
    passwordHash: text("password_hash"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Sessions table
export const sessions = sqliteTable("sessions", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    data: text("data").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Decks table (self-referencing foreign key handled at DB level)
export const decks = sqliteTable("decks", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description"),
    parentId: integer("parent_id"),
    kind: text("kind").notNull().default("deck"),
    userId: text("user_id").references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Cards table
export const cards = sqliteTable("cards", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    deckId: integer("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
    front: text("front").notNull(),
    back: text("back").notNull(),
    tags: text("tags"),
    cardType: text("card_type").notNull().default("basic"),
    choices: text("choices"),
    correctIndex: integer("correct_index"),
    pageNumber: integer("page_number"),
    image: text("image"),
    sourceImage: text("source_image"),
    bbox: text("bbox"),
    // Pre-generated study mode explanations (stored as JSON)
    explanationFull: text("explanation_full"),
    explanationRevision: text("explanation_revision"),
    explanationOsce: text("explanation_osce"),
    explanationBrief: text("explanation_brief"),
    explanationMnemonic: text("explanation_mnemonic"),
    explanationClinical: text("explanation_clinical"),
    explanationTesttrap: text("explanation_testtrap"),
    explanationsGeneratedAt: integer("explanations_generated_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Question Banks table
export const qbanks = sqliteTable("qbanks", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    parentId: integer("parent_id"),
    userId: text("user_id").references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Questions table
export const questions = sqliteTable("questions", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    qbankId: integer("qbank_id").notNull().references(() => qbanks.id, { onDelete: "cascade" }),
    front: text("front").notNull(),
    back: text("back").notNull(),
    choices: text("choices"),
    correctIndex: integer("correct_index"),
    tags: text("tags"),
    pageNumber: integer("page_number"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Mind Maps table
export const mindMaps = sqliteTable("mind_maps", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    deckId: integer("deck_id").references(() => decks.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    data: text("data").notNull(),
    userId: text("user_id").references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Topics table
export const topics = sqliteTable("topics", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description"),
    parentId: integer("parent_id"),
    userId: text("user_id").references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Feedback table
export const feedback = sqliteTable("feedback", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").references(() => users.id),
    type: text("type").notNull(),
    message: text("message").notNull(),
    rating: integer("rating"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Generation Logs table
export const generationLogs = sqliteTable("generation_logs", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id"),
    type: text("type").notNull(),
    model: text("model"),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    durationMs: integer("duration_ms"),
    success: integer("success", { mode: "boolean" }).notNull().default(true),
    errorMessage: text("error_message"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Free Tier Usage table
export const freeTierUsage = sqliteTable("free_tier_usage", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    identifier: text("identifier").notNull().unique(),
    deckCount: integer("deck_count").notNull().default(0),
    lastResetAt: integer("last_reset_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Agent Sessions table
export const agentSessions = sqliteTable("agent_sessions", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    modeId: text("mode_id").notNull(),
    workspaceId: text("workspace_id"),
    status: text("status").notNull().default("idle"),
    messages: text("messages").notNull().default("[]"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Terminal Sessions table
export const terminalSessions = sqliteTable("terminal_sessions", {
    id: text("id").primaryKey(),
    userId: text("user_id"),
    workspaceId: text("workspace_id").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    lastActivityAt: integer("last_activity_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Audit Logs table
export const auditLogs = sqliteTable("audit_logs", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id"),
    action: text("action").notNull(),
    resource: text("resource"),
    resourceId: text("resource_id"),
    details: text("details"),
    ipAddress: text("ip_address"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Error Logs table
export const errorLogs = sqliteTable("error_logs", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    errorType: text("error_type").notNull(),
    errorCode: text("error_code"),
    model: text("model").notNull(),
    operation: text("operation").notNull(),
    inputHash: text("input_hash").notNull(),
    inputPreview: text("input_preview"),
    errorMessage: text("error_message").notNull(),
    errorStack: text("error_stack"),
    context: text("context"),
    resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
    resolutionNotes: text("resolution_notes"),
    fixPattern: text("fix_pattern"),
    occurrenceCount: integer("occurrence_count").notNull().default(1),
    firstSeenAt: integer("first_seen_at", { mode: "timestamp" }).notNull(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Study Plans table
export const studyPlans = sqliteTable("study_plans", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").references(() => users.id),
    title: text("title").notNull(),
    description: text("description"),
    color: text("color").notNull().default("#06b6d4"),
    dayOfWeek: integer("day_of_week").notNull(),
    startHour: integer("start_hour").notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(60),
    deckId: integer("deck_id").references(() => decks.id),
    recurrence: text("recurrence").notNull().default("none"),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Study Sessions log table
export const studySessions = sqliteTable("study_sessions", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").references(() => users.id),
    planId: integer("plan_id").references(() => studyPlans.id),
    deckId: integer("deck_id").references(() => decks.id),
    startedAt: integer("started_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    endedAt: integer("ended_at", { mode: "timestamp" }),
    durationMinutes: integer("duration_minutes"),
    cardsStudied: integer("cards_studied").notNull().default(0),
    knownCount: integer("known_count"),
    unknownCount: integer("unknown_count"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Study Plan Templates table
export const studyPlanTemplates = sqliteTable("study_plan_templates", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").references(() => users.id),
    name: text("name").notNull(),
    description: text("description"),
    sessions: text("sessions").notNull().default("[]"),
    scheduleType: text("schedule_type").notNull().default("weekly"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    lastGeneratedAt: integer("last_generated_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Notifications table
export const notifications = sqliteTable("notifications", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").references(() => users.id),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    read: integer("read", { mode: "boolean" }).notNull().default(false),
    actionUrl: text("action_url"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Card Progress table — SM-2 spaced repetition
export const cardProgress = sqliteTable("card_progress", {
    cardId: integer("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }).primaryKey(),
    userId: text("user_id").references(() => users.id),
    easeFactor: integer("ease_factor", { mode: "number" }).notNull().default(2.5),
    intervalDays: integer("interval_days").notNull().default(0),
    repetitions: integer("repetitions").notNull().default(0),
    nextReviewDate: text("next_review_date").notNull().default(sql `(date('now'))`),
    lastStudiedAt: integer("last_studied_at", { mode: "timestamp" }),
    totalStudiedCount: integer("total_studied_count").notNull().default(0),
    knownCount: integer("known_count").notNull().default(0),
    unknownCount: integer("unknown_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Tags table
export const tags = sqliteTable("tags", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#06B6D4"),
    userId: text("user_id").references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
// Deck-Tag junction table
export const deckTags = sqliteTable("deck_tags", {
    deckId: integer("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
    tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
});
// QBank-Tag junction table
export const qbankTags = sqliteTable("qbank_tags", {
    qbankId: integer("qbank_id").notNull().references(() => qbanks.id, { onDelete: "cascade" }),
    tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
});
export const achievements = sqliteTable("achievements", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull().references(() => users.id),
    type: text("type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    icon: text("icon").notNull(),
    unlockedAt: integer("unlocked_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    seen: integer("seen", { mode: "boolean" }).notNull().default(false),
});
export const userSettings = sqliteTable("user_settings", {
    userId: text("user_id").primaryKey().references(() => users.id),
    dailyGoalMinutes: integer("daily_goal_minutes").notNull().default(20),
    dailyGoalCards: integer("daily_goal_cards").notNull().default(30),
    reminderTime: text("reminder_time"),
    accentColor: text("accent_color").notNull().default("cyan"),
    dashboardLayout: text("dashboard_layout"),
    density: text("density").notNull().default("comfortable"),
    soundEnabled: integer("sound_enabled", { mode: "boolean" }).notNull().default(false),
    streakFreezeUsedAt: integer("streak_freeze_used_at", { mode: "timestamp" }),
    theme: text("theme").notNull().default("dark"),
    animationsEnabled: integer("animations_enabled", { mode: "boolean" }).notNull().default(true),
    fontSize: text("font_size").notNull().default("medium"),
    defaultStyle: text("default_style").notNull().default("modern"),
    defaultMode: text("default_mode").notNull().default("combined"),
    autoTts: integer("auto_tts", { mode: "boolean" }).notNull().default(false),
    chunkSize: integer("chunk_size").notNull().default(3),
    cardOrder: text("card_order").notNull().default("sequential"),
    autoReveal: integer("auto_reveal", { mode: "boolean" }).notNull().default(false),
    autoRevealSeconds: integer("auto_reveal_seconds").notNull().default(5),
    showExplanation: integer("show_explanation", { mode: "boolean" }).notNull().default(true),
    streakFreeze: integer("streak_freeze", { mode: "boolean" }).notNull().default(true),
    emailNotifications: integer("email_notifications", { mode: "boolean" }).notNull().default(true),
    emailWeeklySummary: integer("email_weekly_summary", { mode: "boolean" }).notNull().default(true),
    emailStreakAlert: integer("email_streak_alert", { mode: "boolean" }).notNull().default(true),
    pushNotifications: integer("push_notifications", { mode: "boolean" }).notNull().default(true),
    pushReminderTime: text("push_reminder_time").notNull().default("18:00"),
    pushReviewDue: integer("push_review_due", { mode: "boolean" }).notNull().default(true),
    pushSessionComplete: integer("push_session_complete", { mode: "boolean" }).notNull().default(true),
    inAppSounds: integer("in_app_sounds", { mode: "boolean" }).notNull().default(false),
    soundVolume: integer("sound_volume").notNull().default(70),
    ambientEnabled: integer("ambient_enabled", { mode: "boolean" }).notNull().default(true),
    customCursorEnabled: integer("custom_cursor_enabled", { mode: "boolean" }).notNull().default(true),
    ripplesEnabled: integer("ripples_enabled", { mode: "boolean" }).notNull().default(true),
    animationSpeed: integer("animation_speed").notNull().default(100),
    reduceMotion: integer("reduce_motion", { mode: "boolean" }).notNull().default(false),
    studyBuddyEnabled: integer("study_buddy_enabled", { mode: "boolean" }).notNull().default(true),
    smartReviewEnabled: integer("smart_review_enabled", { mode: "boolean" }).notNull().default(true),
    deckDoctorEnabled: integer("deck_doctor_enabled", { mode: "boolean" }).notNull().default(true),
    examSimulatorEnabled: integer("exam_simulator_enabled", { mode: "boolean" }).notNull().default(true),
    contentSummarizerEnabled: integer("content_summarizer_enabled", { mode: "boolean" }).notNull().default(true),
    mnemonicGeneratorEnabled: integer("mnemonic_generator_enabled", { mode: "boolean" }).notNull().default(true),
    progressCoachEnabled: integer("progress_coach_enabled", { mode: "boolean" }).notNull().default(true),
    imageAnalyzerEnabled: integer("image_analyzer_enabled", { mode: "boolean" }).notNull().default(true),
    voiceTutorEnabled: integer("voice_tutor_enabled", { mode: "boolean" }).notNull().default(true),
    collaborativeStudyEnabled: integer("collaborative_study_enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const milestoneAcknowledgments = sqliteTable("milestone_acknowledgments", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull().references(() => users.id),
    milestoneType: text("milestone_type").notNull(),
    milestoneValue: integer("milestone_value").notNull(),
    acknowledgedAt: integer("acknowledged_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const emailVerificationTokens = sqliteTable("email_verification_tokens", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull().references(() => users.id),
    token: text("token").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const passwordResetTokens = sqliteTable("password_reset_tokens", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull().references(() => users.id),
    token: text("token").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    usedAt: integer("used_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const chatMessages = sqliteTable("chat_messages", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").references(() => users.id),
    role: text("role").notNull(),
    content: text("content").notNull(),
    deckContext: text("deck_context"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const agentUsage = sqliteTable("agent_usage", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").references(() => users.id),
    agentId: text("agent_id").notNull(),
    tokensUsed: integer("tokens_used").notNull().default(0),
    durationMs: integer("duration_ms"),
    success: integer("success", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const exams = sqliteTable("exams", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").references(() => users.id),
    title: text("title").notNull(),
    deckIds: text("deck_ids").notNull().default("[]"),
    questions: text("questions").notNull().default("[]"),
    answers: text("answers"),
    score: integer("score"),
    totalQuestions: integer("total_questions").notNull().default(0),
    durationMinutes: integer("duration_minutes"),
    startedAt: integer("started_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const groupStudyRooms = sqliteTable("group_study_rooms", {
    id: text("id").primaryKey(),
    hostUserId: text("host_user_id").references(() => users.id),
    deckIds: text("deck_ids").notNull().default("[]"),
    status: text("status").notNull().default("waiting"),
    currentQuestionIndex: integer("current_question_index").notNull().default(0),
    questions: text("questions").notNull().default("[]"),
    participants: text("participants").notNull().default("[]"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const supportKnowledge = sqliteTable("support_knowledge", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    category: text("category").notNull().default("general"),
    question: text("question").notNull(),
    keywords: text("keywords").notNull().default("[]"),
    answer: text("answer").notNull(),
    answerPlain: text("answer_plain").notNull(),
    relatedQuestions: text("related_questions").default("[]"),
    views: integer("views").notNull().default(0),
    helpfulCount: integer("helpful_count").notNull().default(0),
    notHelpfulCount: integer("not_helpful_count").notNull().default(0),
    isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const supportConversations = sqliteTable("support_conversations", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").references(() => users.id),
    sessionId: text("session_id").notNull(),
    status: text("status").notNull().default("active"),
    rating: integer("rating"),
    feedback: text("feedback"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const supportMessages = sqliteTable("support_messages", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    conversationId: integer("conversation_id").notNull().references(() => supportConversations.id),
    role: text("role").notNull(),
    content: text("content").notNull(),
    source: text("source").default("knowledge"),
    knowledgeId: integer("knowledge_id").references(() => supportKnowledge.id),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const agentKnowledge = sqliteTable("agent_knowledge", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    agentId: text("agent_id").notNull(),
    category: text("category").notNull().default("general"),
    question: text("question").notNull(),
    keywords: text("keywords").notNull().default("[]"),
    answer: text("answer").notNull(),
    priority: integer("priority").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    usageCount: integer("usage_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const agentResponseCache = sqliteTable("agent_response_cache", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    agentId: text("agent_id").notNull(),
    questionHash: text("question_hash").notNull(),
    questionOriginal: text("question_original").notNull(),
    answer: text("answer").notNull(),
    source: text("source").notNull().default("ai"),
    confidence: integer("confidence", { mode: "number" }).notNull().default(0.8),
    hitCount: integer("hit_count").notNull().default(1),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    lastHitAt: integer("last_hit_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export const agentCacheAnalytics = sqliteTable("agent_cache_analytics", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    agentId: text("agent_id").notNull(),
    date: text("date").notNull(),
    totalQuestions: integer("total_questions").notNull().default(0),
    memoryHits: integer("memory_hits").notNull().default(0),
    knowledgeHits: integer("knowledge_hits").notNull().default(0),
    dbCacheHits: integer("db_cache_hits").notNull().default(0),
    apiCalls: integer("api_calls").notNull().default(0),
    avgResponseMs: integer("avg_response_ms").notNull().default(0),
});
// Article Generation Jobs table
export const articleJobs = sqliteTable("article_jobs", {
    id: text("id").primaryKey(),
    deckId: integer("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    status: text("status").notNull().default("pending"),
    progress: integer("progress").notNull().default(0),
    outline: text("outline"),
    contentMarkdown: text("content_markdown"),
    error: text("error"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
//# sourceMappingURL=schema.js.map