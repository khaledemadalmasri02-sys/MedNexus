CREATE TABLE IF NOT EXISTS article_jobs (
  id TEXT PRIMARY KEY,
  deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  outline TEXT,
  content_markdown TEXT,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_article_jobs_deck ON article_jobs(deck_id);
CREATE INDEX IF NOT EXISTS idx_article_jobs_status ON article_jobs(status);
CREATE INDEX IF NOT EXISTS idx_article_jobs_created ON article_jobs(created_at);
