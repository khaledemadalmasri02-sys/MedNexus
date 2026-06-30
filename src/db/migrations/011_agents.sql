-- Agent infrastructure: chat messages, agent usage, exams

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  deck_context TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);

CREATE TABLE IF NOT EXISTS agent_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  agent_id TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  duration_ms INTEGER,
  success INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_usage_user ON agent_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_usage_agent ON agent_usage(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_usage_date ON agent_usage(created_at);

CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  deck_ids TEXT NOT NULL DEFAULT '[]',
  questions TEXT NOT NULL DEFAULT '[]',
  answers TEXT,
  score INTEGER,
  total_questions INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_exams_user ON exams(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_created ON exams(created_at);

CREATE TABLE IF NOT EXISTS group_study_rooms (
  id TEXT PRIMARY KEY,
  host_user_id TEXT REFERENCES users(id),
  deck_ids TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting', 'active', 'finished')),
  current_question_index INTEGER DEFAULT 0,
  questions TEXT NOT NULL DEFAULT '[]',
  participants TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_group_rooms_host ON group_study_rooms(host_user_id);
CREATE INDEX IF NOT EXISTS idx_group_rooms_status ON group_study_rooms(status);
