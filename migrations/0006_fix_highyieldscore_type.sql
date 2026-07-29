-- Fix high_yield_score column type from INTEGER to REAL
-- This migration recreates the cards table with the correct column type

-- Create new table with correct schema
CREATE TABLE IF NOT EXISTS cards_new (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deck_id` integer NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`tags` text,
	`card_type` text DEFAULT 'basic' NOT NULL,
	`choices` text,
	`correct_index` integer,
	`page_number` integer,
	`image` text,
	`source_image` text,
	`bbox` text,
	`explanation_full` text,
	`explanation_revision` text,
	`explanation_osce` text,
	`explanation_brief` text,
	`explanation_mnemonic` text,
	`explanation_clinical` text,
	`explanation_testtrap` text,
	`explanations_generated_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ai_front` text,
	`ai_back` text,
	`ai_explanation` text,
	`ai_generated` integer DEFAULT 0 NOT NULL,
	`source` text DEFAULT 'heuristic' NOT NULL,
	`subject` text,
	`organ_system` text,
	`difficulty` text,
	`high_yield_score` real DEFAULT 0.5,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Copy data from old table to new table
INSERT OR REPLACE INTO cards_new 
SELECT 
	id, deck_id, front, back, tags, card_type, choices, correct_index, page_number, 
	image, source_image, bbox, explanation_full, explanation_revision, explanation_osce, 
	explanation_brief, explanation_mnemonic, explanation_clinical, explanation_testtrap,
	explanations_generated_at, created_at, updated_at, ai_front, ai_back, ai_explanation,
	ai_generated, source, subject, organ_system, difficulty, high_yield_score
FROM cards;

-- Drop old table
DROP TABLE cards;

-- Rename new table to original name
ALTER TABLE cards_new RENAME TO cards;

-- Recreate indexes and foreign key constraints
CREATE INDEX IF NOT EXISTS `cards_deck_id_idx` ON cards (`deck_id`);