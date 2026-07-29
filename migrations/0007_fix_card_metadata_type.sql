-- Fix card_metadata high_yield_score column type from INTEGER to REAL
-- This migration recreates the card_metadata table with the correct column type

-- Create new table with correct schema
CREATE TABLE IF NOT EXISTS card_metadata_new (
	`card_id` integer PRIMARY KEY NOT NULL,
	`subject` text,
	`organ_system` text,
	`difficulty` text,
	`high_yield_score` real DEFAULT 0.5,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Copy data from old table to new table
INSERT OR REPLACE INTO card_metadata_new 
SELECT card_id, subject, organ_system, difficulty, high_yield_score, created_at, updated_at
FROM card_metadata;

-- Drop old table
DROP TABLE card_metadata;

-- Rename new table to original name
ALTER TABLE card_metadata_new RENAME TO card_metadata;