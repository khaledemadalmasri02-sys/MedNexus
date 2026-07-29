-- Fix ease_factor column type from INTEGER to REAL
-- This migration recreates the card_progress table with the correct column type

CREATE TABLE IF NOT EXISTS card_progress_new (
  card_id integer PRIMARY KEY NOT NULL,
  user_id text,
  ease_factor real DEFAULT 2.5 NOT NULL,
  interval_days integer DEFAULT 0 NOT NULL,
  repetitions integer DEFAULT 0 NOT NULL,
  next_review_date text DEFAULT (date('now')) NOT NULL,
  last_studied_at integer,
  total_studied_count integer DEFAULT 0 NOT NULL,
  known_count integer DEFAULT 0 NOT NULL,
  unknown_count integer DEFAULT 0 NOT NULL,
  created_at integer NOT NULL,
  updated_at integer NOT NULL,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
);

INSERT INTO card_progress_new 
SELECT 
  card_id, user_id, ease_factor, interval_days, repetitions, next_review_date, 
  last_studied_at, total_studied_count, known_count, unknown_count, 
  created_at, updated_at
FROM card_progress;

DROP TABLE card_progress;

ALTER TABLE card_progress_new RENAME TO card_progress;