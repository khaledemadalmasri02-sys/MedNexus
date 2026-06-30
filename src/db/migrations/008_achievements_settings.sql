CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL,
  seen INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  daily_goal_minutes INTEGER NOT NULL DEFAULT 20,
  daily_goal_cards INTEGER NOT NULL DEFAULT 30,
  reminder_time TEXT,
  accent_color TEXT NOT NULL DEFAULT 'cyan',
  dashboard_layout TEXT,
  density TEXT NOT NULL DEFAULT 'comfortable',
  sound_enabled INTEGER NOT NULL DEFAULT 0,
  streak_freeze_used_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS milestone_acknowledgments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  milestone_type TEXT NOT NULL,
  milestone_value INTEGER NOT NULL,
  acknowledged_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id, seen);
CREATE INDEX IF NOT EXISTS idx_milestone_ack_user ON milestone_acknowledgments(user_id, milestone_type);
