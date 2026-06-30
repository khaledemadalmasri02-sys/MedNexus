CREATE TABLE IF NOT EXISTS study_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#06b6d4',
  day_of_week INTEGER NOT NULL,
  start_hour INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  deck_id INTEGER REFERENCES decks(id),
  recurrence TEXT NOT NULL DEFAULT 'none',
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  plan_id INTEGER REFERENCES study_plans(id),
  deck_id INTEGER REFERENCES decks(id),
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  duration_minutes INTEGER,
  cards_studied INTEGER NOT NULL DEFAULT 0,
  known_count INTEGER,
  unknown_count INTEGER,
  created_at INTEGER NOT NULL
);
