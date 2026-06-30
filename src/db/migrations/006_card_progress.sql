CREATE TABLE IF NOT EXISTS card_progress (
  card_id INTEGER PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  next_review_date TEXT NOT NULL DEFAULT '1970-01-01',
  last_studied_at INTEGER,
  total_studied_count INTEGER NOT NULL DEFAULT 0,
  known_count INTEGER NOT NULL DEFAULT 0,
  unknown_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_card_progress_user ON card_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_card_progress_next_review ON card_progress(next_review_date);
CREATE INDEX IF NOT EXISTS idx_card_progress_deck_user ON card_progress(card_id, user_id);
