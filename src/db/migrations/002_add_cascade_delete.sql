-- Migration 002: Add ON DELETE CASCADE to foreign keys
-- SQLite does not support ALTER TABLE to add CASCADE, so we must
-- recreate the tables that are missing it.

-- Recreate cards with ON DELETE CASCADE on deck_id
CREATE TABLE cards_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  tags TEXT,
  card_type TEXT NOT NULL DEFAULT 'basic',
  choices TEXT,
  correct_index INTEGER,
  page_number INTEGER,
  image TEXT,
  source_image TEXT,
  bbox TEXT,
  explanation_full TEXT,
  explanation_revision TEXT,
  explanation_osce TEXT,
  explanation_brief TEXT,
  explanation_mnemonic TEXT,
  explanation_clinical TEXT,
  explanation_testtrap TEXT,
  explanations_generated_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT INTO cards_new (id, deck_id, front, back, tags, card_type, choices, correct_index, page_number, image, source_image, bbox, explanation_full, explanation_revision, explanation_osce, explanation_brief, explanation_mnemonic, explanation_clinical, explanation_testtrap, explanations_generated_at, created_at, updated_at)
SELECT id, deck_id, front, back, tags, card_type, choices, correct_index, page_number, image, source_image, bbox, explanation_full, explanation_revision, explanation_osce, explanation_brief, explanation_mnemonic, explanation_clinical, explanation_testtrap, explanations_generated_at, created_at, updated_at FROM cards;

DROP TABLE cards;
ALTER TABLE cards_new RENAME TO cards;

-- Recreate mind_maps with ON DELETE CASCADE on deck_id
CREATE TABLE mind_maps_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_id INTEGER REFERENCES decks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  data TEXT NOT NULL,
  user_id TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT INTO mind_maps_new (id, deck_id, title, data, user_id, created_at, updated_at)
SELECT id, deck_id, title, data, user_id, created_at, updated_at FROM mind_maps;

DROP TABLE mind_maps;
ALTER TABLE mind_maps_new RENAME TO mind_maps;

-- Recreate questions with ON DELETE CASCADE on qbank_id
CREATE TABLE questions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qbank_id INTEGER NOT NULL REFERENCES qbanks(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  choices TEXT,
  correct_index INTEGER,
  tags TEXT,
  page_number INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT INTO questions_new (id, qbank_id, front, back, choices, correct_index, tags, page_number, created_at, updated_at)
SELECT id, qbank_id, front, back, choices, correct_index, tags, page_number, created_at, updated_at FROM questions;

DROP TABLE questions;
ALTER TABLE questions_new RENAME TO questions;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_deck_id ON mind_maps(deck_id);
CREATE INDEX IF NOT EXISTS idx_questions_qbank_id ON questions(qbank_id);
