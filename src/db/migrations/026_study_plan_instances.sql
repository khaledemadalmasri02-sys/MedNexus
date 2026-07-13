-- Migration 026: Materialized recurring plan instances
CREATE TABLE IF NOT EXISTS study_plan_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  occurrence_date TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  start_hour INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#06b6d4',
  deck_id INTEGER REFERENCES decks(id),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plan_instances_user_date ON study_plan_instances(user_id, occurrence_date);
