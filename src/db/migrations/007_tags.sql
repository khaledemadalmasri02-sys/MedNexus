CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#06B6D4',
  user_id TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL,
  UNIQUE(name, user_id)
);

CREATE TABLE IF NOT EXISTS deck_tags (
  deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (deck_id, tag_id)
);

CREATE TABLE IF NOT EXISTS qbank_tags (
  qbank_id INTEGER NOT NULL REFERENCES qbanks(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (qbank_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_deck_tags_tag ON deck_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_qbank_tags_tag ON qbank_tags(tag_id);
