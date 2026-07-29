-- AI OSCE Simulator SQLite Database Schema (D1 Compatible)
-- Converted from PostgreSQL schema for Cloudflare D1

-- ============================================================================
-- USER ROLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_roles (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- UNIVERSITIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_universities (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    country TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- SPECIALTIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_specialties (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- USERS TABLE (SQLite version for OSCE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_users (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- STUDENT PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_student_profiles (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL UNIQUE REFERENCES osce_users(id) ON DELETE CASCADE,
    university_id TEXT REFERENCES osce_universities(id),
    year_of_study TEXT,
    specialty_interest TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- FACULTY PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_faculty_profiles (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL UNIQUE REFERENCES osce_users(id) ON DELETE CASCADE,
    university_id TEXT REFERENCES osce_universities(id),
    department TEXT,
    specialty TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- STATION TYPES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_station_types (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- OSCE STATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_stations (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    specialty_id TEXT NOT NULL REFERENCES osce_specialties(id),
    station_type_id TEXT NOT NULL REFERENCES osce_station_types(id),
    difficulty TEXT NOT NULL DEFAULT 'medium',
    duration INTEGER NOT NULL,
    instructions TEXT,
    learning_objectives TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- STATION VERSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_station_versions (
    id TEXT PRIMARY KEY NOT NULL,
    station_id TEXT NOT NULL REFERENCES osce_stations(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT,
    created_by TEXT REFERENCES osce_users(id),
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- PATIENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_patients (
    id TEXT PRIMARY KEY NOT NULL,
    station_id TEXT NOT NULL REFERENCES osce_stations(id) ON DELETE CASCADE,
    name TEXT,
    age INTEGER,
    gender TEXT,
    occupation TEXT,
    personality TEXT,
    communication_style TEXT
);

-- ============================================================================
-- PATIENT CONDITIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_patient_conditions (
    id TEXT PRIMARY KEY NOT NULL,
    patient_id TEXT NOT NULL REFERENCES osce_patients(id) ON DELETE CASCADE,
    condition TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
);

-- ============================================================================
-- PATIENT HIDDEN DATA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_patient_hidden_data (
    id TEXT PRIMARY KEY NOT NULL,
    patient_id TEXT NOT NULL REFERENCES osce_patients(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    information TEXT NOT NULL,
    importance TEXT NOT NULL DEFAULT 'medium'
);

-- ============================================================================
-- CLINICAL FINDINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_clinical_findings (
    id TEXT PRIMARY KEY NOT NULL,
    patient_id TEXT NOT NULL REFERENCES osce_patients(id) ON DELETE CASCADE,
    system TEXT,
    finding TEXT,
    trigger_condition TEXT
);

-- ============================================================================
-- RUBRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_rubrics (
    id TEXT PRIMARY KEY NOT NULL,
    station_id TEXT NOT NULL REFERENCES osce_stations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    weight REAL NOT NULL DEFAULT 1.0
);

-- ============================================================================
-- RUBRIC ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_rubric_items (
    id TEXT PRIMARY KEY NOT NULL,
    rubric_id TEXT NOT NULL REFERENCES osce_rubrics(id) ON DELETE CASCADE,
    criterion TEXT NOT NULL,
    points INTEGER NOT NULL,
    critical INTEGER NOT NULL DEFAULT 0
);

-- ============================================================================
-- OSCE SESSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES osce_users(id),
    station_id TEXT NOT NULL REFERENCES osce_stations(id),
    started_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL,
    ended_at INTEGER,
    status TEXT NOT NULL DEFAULT 'created'
);

-- ============================================================================
-- CONVERSATION MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_conversation_messages (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES osce_sessions(id) ON DELETE CASCADE,
    speaker TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- AI EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_ai_events (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES osce_sessions(id) ON DELETE CASCADE,
    agent TEXT NOT NULL,
    input TEXT,
    output TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- OSCE SCORES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_scores (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES osce_sessions(id) ON DELETE CASCADE,
    total_score REAL,
    pass_status INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- SCORE COMPONENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_score_components (
    id TEXT PRIMARY KEY NOT NULL,
    score_id TEXT NOT NULL REFERENCES osce_scores(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    score REAL NOT NULL,
    max_score REAL NOT NULL
);

-- ============================================================================
-- FEEDBACK REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_feedback_reports (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES osce_sessions(id) ON DELETE CASCADE,
    strengths TEXT NOT NULL DEFAULT '[]',
    weaknesses TEXT NOT NULL DEFAULT '[]',
    recommendations TEXT NOT NULL DEFAULT '[]'
);

-- ============================================================================
-- STUDENT SKILLS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_student_skills (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES osce_users(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    score REAL NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- STUDENT WEAKNESSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_student_weaknesses (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES osce_users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    frequency INTEGER NOT NULL DEFAULT 1,
    priority TEXT NOT NULL DEFAULT 'medium'
);

-- ============================================================================
-- LEARNING RECOMMENDATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_learning_recommendations (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES osce_users(id) ON DELETE CASCADE,
    recommended_station_id TEXT NOT NULL REFERENCES osce_stations(id),
    reason TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0
);

-- ============================================================================
-- MEDICAL DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_medical_documents (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    source TEXT,
    type TEXT,
    uploaded_by TEXT REFERENCES osce_users(id)
);

-- ============================================================================
-- DOCUMENT CHUNKS TABLE (embedding stored as TEXT for D1)
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_document_chunks (
    id TEXT PRIMARY KEY NOT NULL,
    document_id TEXT NOT NULL REFERENCES osce_medical_documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding TEXT
);

-- ============================================================================
-- STATION REVIEWS TABLE (Faculty Content Management)
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_station_reviews (
    id TEXT PRIMARY KEY NOT NULL,
    station_id TEXT NOT NULL REFERENCES osce_stations(id) ON DELETE CASCADE,
    reviewer_id TEXT NOT NULL REFERENCES osce_users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    comments TEXT
);

-- ============================================================================
-- OSCE PROGRESS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_progress (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES osce_users(id) ON DELETE CASCADE,
    station_id TEXT NOT NULL REFERENCES osce_stations(id) ON DELETE CASCADE,
    attempts_count INTEGER NOT NULL DEFAULT 0,
    best_score REAL,
    average_score REAL,
    last_attempt_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- OSCE EXAMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_exams (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES osce_users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    station_ids TEXT NOT NULL DEFAULT '[]',
    total_time_minutes INTEGER NOT NULL DEFAULT 120,
    is_mock INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- OSCE ATTEMPTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_attempts (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES osce_users(id),
    exam_id TEXT NOT NULL REFERENCES osce_exams(id) ON DELETE CASCADE,
    station_id TEXT NOT NULL REFERENCES osce_stations(id),
    started_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL,
    completed_at INTEGER,
    duration_seconds INTEGER,
    conversation_log TEXT DEFAULT '[]',
    score REAL,
    scores_by_category TEXT DEFAULT '{}',
    feedback TEXT DEFAULT '{}',
    strengths TEXT DEFAULT '[]',
    weaknesses TEXT DEFAULT '[]',
    improvement_plan TEXT,
    examiner_notes TEXT DEFAULT '{}',
    is_completed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- OSCE ANALYTICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_analytics (
    id TEXT PRIMARY KEY NOT NULL,
    station_id TEXT NOT NULL REFERENCES osce_stations(id) ON DELETE CASCADE,
    total_attempts INTEGER NOT NULL DEFAULT 0,
    total_completions INTEGER NOT NULL DEFAULT 0,
    average_score REAL DEFAULT 0,
    most_failed_category TEXT,
    weak_areas TEXT DEFAULT '[]',
    last_updated INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- OSCE EXAM READINESS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_exam_readiness (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES osce_users(id) ON DELETE CASCADE UNIQUE,
    readiness_score REAL NOT NULL,
    pass_probability TEXT NOT NULL,
    critical_errors INTEGER NOT NULL DEFAULT 0,
    consistency_score REAL NOT NULL,
    recent_scores TEXT NOT NULL DEFAULT '[]',
    last_calculated INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- OSCE SPACED REPETITION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_spaced_repetition (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES osce_users(id) ON DELETE CASCADE,
    station_id TEXT NOT NULL REFERENCES osce_stations(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    next_review_at INTEGER,
    last_reviewed_at INTEGER,
    ease_factor REAL NOT NULL DEFAULT 2.5,
    interval_days INTEGER NOT NULL DEFAULT 0,
    repetitions INTEGER NOT NULL DEFAULT 0,
    quality INTEGER,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- OSCE CLINICAL HEATMAP TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_clinical_heatmap (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES osce_users(id),
    history_taking INTEGER NOT NULL DEFAULT 0,
    communication INTEGER NOT NULL DEFAULT 0,
    clinical_reasoning INTEGER NOT NULL DEFAULT 0,
    management INTEGER NOT NULL DEFAULT 0,
    emergency_response INTEGER NOT NULL DEFAULT 0,
    professional_skills INTEGER NOT NULL DEFAULT 0,
    last_updated INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- OSCE CONFIDENCE TRACKING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_confidence_tracking (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES osce_users(id),
    attempt_id TEXT NOT NULL REFERENCES osce_attempts(id) ON DELETE CASCADE,
    confidence_rating INTEGER NOT NULL,
    self_score INTEGER,
    actual_score INTEGER,
    calibration_gap INTEGER,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- OSCE PROGRESS TIMELINE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_progress_timeline (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES osce_users(id),
    date TEXT NOT NULL,
    average_score REAL,
    attempts_count INTEGER NOT NULL DEFAULT 0,
    stations_practiced INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- OSCE SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS osce_settings (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES osce_users(id) ON DELETE CASCADE UNIQUE,
    voice_enabled INTEGER NOT NULL DEFAULT 1,
    auto_submit_enabled INTEGER NOT NULL DEFAULT 0,
    show_hints INTEGER NOT NULL DEFAULT 1,
    difficulty_filter TEXT NOT NULL DEFAULT 'all',
    preferred_station_types TEXT DEFAULT '[]',
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- ============================================================================
-- DATABASE INDEXES
-- ============================================================================

-- Index for station specialty lookup
CREATE INDEX IF NOT EXISTS idx_osce_stations_specialty ON osce_stations(specialty_id);

-- Index for student session history
CREATE INDEX IF NOT EXISTS idx_osce_sessions_user_id ON osce_sessions(user_id);

-- Index for score lookup (analytics)
CREATE INDEX IF NOT EXISTS idx_osce_scores_total_score ON osce_scores(total_score);

-- Index for student skills lookup
CREATE INDEX IF NOT EXISTS idx_student_skills_user_id ON osce_student_skills(user_id);

-- Index for student weaknesses
CREATE INDEX IF NOT EXISTS idx_student_weaknesses_user_id ON osce_student_weaknesses(user_id);

-- Index for learning recommendations
CREATE INDEX IF NOT EXISTS idx_learning_recommendations_user_id ON osce_learning_recommendations(user_id);

-- Index for conversation messages
CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_id ON osce_conversation_messages(session_id);

-- Index for AI events
CREATE INDEX IF NOT EXISTS idx_ai_events_session_id ON osce_ai_events(session_id);

-- Index for document chunks
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON osce_document_chunks(document_id);

-- Index for progress tracking
CREATE INDEX IF NOT EXISTS idx_osce_progress_user_station ON osce_progress(user_id, station_id);

-- Index for station versions
CREATE INDEX IF NOT EXISTS idx_station_versions_station_id ON osce_station_versions(station_id);

-- Index for patient lookup
CREATE INDEX IF NOT EXISTS idx_patients_station_id ON osce_patients(station_id);

-- Index for rubrics
CREATE INDEX IF NOT EXISTS idx_rubrics_station_id ON osce_rubrics(station_id);

-- Index for station reviews
CREATE INDEX IF NOT EXISTS idx_station_reviews_station_id ON osce_station_reviews(station_id);
CREATE INDEX IF NOT EXISTS idx_station_reviews_reviewer_id ON osce_station_reviews(reviewer_id);

-- Index for exams
CREATE INDEX IF NOT EXISTS idx_osce_exams_user_id ON osce_exams(user_id);

-- Index for attempts
CREATE INDEX IF NOT EXISTS idx_osce_attempts_user_id ON osce_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_osce_attempts_exam_id ON osce_attempts(exam_id);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_osce_analytics_station_id ON osce_analytics(station_id);

-- Index for spaced repetition
CREATE INDEX IF NOT EXISTS idx_osce_spaced_repetition_user_station ON osce_spaced_repetition(user_id, station_id);
CREATE INDEX IF NOT EXISTS idx_osce_spaced_repetition_next_review ON osce_spaced_repetition(next_review_at);

-- Index for heatmap
CREATE INDEX IF NOT EXISTS idx_osce_clinical_heatmap_user_id ON osce_clinical_heatmap(user_id);

-- Index for confidence tracking
CREATE INDEX IF NOT EXISTS idx_osce_confidence_tracking_user_id ON osce_confidence_tracking(user_id);

-- Index for progress timeline
CREATE INDEX IF NOT EXISTS idx_osce_progress_timeline_user_date ON osce_progress_timeline(user_id, date);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS update_osce_stations_updated_at 
    BEFORE UPDATE ON osce_stations 
    FOR EACH ROW 
    BEGIN
        SELECT NEW.updated_at = strftime('%s','now') * 1000;
    END;

CREATE TRIGGER IF NOT EXISTS update_osce_progress_updated_at 
    BEFORE UPDATE ON osce_progress 
    FOR EACH ROW 
    BEGIN
        SELECT NEW.updated_at = strftime('%s','now') * 1000;
    END;

CREATE TRIGGER IF NOT EXISTS update_osce_exams_updated_at 
    BEFORE UPDATE ON osce_exams 
    FOR EACH ROW 
    BEGIN
        SELECT NEW.updated_at = strftime('%s','now') * 1000;
    END;

CREATE TRIGGER IF NOT EXISTS update_osce_attempts_updated_at 
    BEFORE UPDATE ON osce_attempts 
    FOR EACH ROW 
    BEGIN
        SELECT NEW.updated_at = strftime('%s','now') * 1000;
    END;

CREATE TRIGGER IF NOT EXISTS update_osce_spaced_repetition_updated_at 
    BEFORE UPDATE ON osce_spaced_repetition 
    FOR EACH ROW 
    BEGIN
        SELECT NEW.updated_at = strftime('%s','now') * 1000;
    END;

CREATE TRIGGER IF NOT EXISTS update_osce_clinical_heatmap_updated_at 
    BEFORE UPDATE ON osce_clinical_heatmap 
    FOR EACH ROW 
    BEGIN
        SELECT NEW.last_updated = strftime('%s','now') * 1000;
    END;

CREATE TRIGGER IF NOT EXISTS update_osce_settings_updated_at 
    BEFORE UPDATE ON osce_settings 
    FOR EACH ROW 
    BEGIN
        SELECT NEW.updated_at = strftime('%s','now') * 1000;
    END;