-- Add agent toggle settings to user_settings
ALTER TABLE user_settings ADD COLUMN study_buddy_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN smart_review_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN deck_doctor_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN exam_simulator_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN content_summarizer_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN mnemonic_generator_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN progress_coach_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN image_analyzer_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN voice_tutor_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN collaborative_study_enabled INTEGER NOT NULL DEFAULT 1;
