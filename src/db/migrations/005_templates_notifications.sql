CREATE TABLE IF NOT EXISTS study_plan_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  sessions TEXT NOT NULL DEFAULT '[]',
  schedule_type TEXT NOT NULL DEFAULT 'weekly',
  active INTEGER NOT NULL DEFAULT 1,
  last_generated_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  action_url TEXT,
  created_at INTEGER NOT NULL
);
