CREATE TABLE IF NOT EXISTS error_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  error_type TEXT NOT NULL,
  error_code TEXT,
  model TEXT NOT NULL,
  operation TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  input_preview TEXT,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context TEXT,
  resolved INTEGER NOT NULL DEFAULT 0,
  resolution_notes TEXT,
  fix_pattern TEXT,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_input_hash ON error_logs(input_hash);
CREATE INDEX IF NOT EXISTS idx_error_logs_model ON error_logs(model);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_last_seen ON error_logs(last_seen_at);
