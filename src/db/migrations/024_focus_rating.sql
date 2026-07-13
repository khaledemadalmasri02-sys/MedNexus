-- Migration 024: Focus self-rating on study sessions
ALTER TABLE study_sessions ADD COLUMN focus_rating INTEGER;
