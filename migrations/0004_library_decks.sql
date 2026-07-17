CREATE TABLE `library_cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`library_deck_id` integer NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`tags` text,
	`card_type` text DEFAULT 'basic' NOT NULL,
	`difficulty` text,
	`ai_front` text,
	`ai_back` text,
	`ai_explanation` text,
	`source` text DEFAULT 'heuristic' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	FOREIGN KEY (`library_deck_id`) REFERENCES `library_decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `library_decks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text DEFAULT 'general' NOT NULL,
	`tags` text,
	`difficulty` text,
	`card_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	CONSTRAINT `library_decks_name_unique` UNIQUE (`name`)
);
