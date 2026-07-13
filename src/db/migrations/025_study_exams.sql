-- Migration 025: Study exams (goals with target dates)
CREATE TABLE IF NOT EXISTS study_exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  subject TEXT,
  exam_date INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT '#06b6d4',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
