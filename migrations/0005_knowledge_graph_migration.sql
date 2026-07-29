-- Add metadata columns to cards table
ALTER TABLE `cards` ADD COLUMN `subject` text;
ALTER TABLE `cards` ADD COLUMN `organ_system` text;
ALTER TABLE `cards` ADD COLUMN `difficulty` text;
ALTER TABLE `cards` ADD COLUMN `high_yield_score` real DEFAULT 0.5;

-- Create knowledge graph nodes table
CREATE TABLE IF NOT EXISTS `knowledge_graph_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`content` text,
	`metadata` text,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL
);

-- Create knowledge graph edges table
CREATE TABLE IF NOT EXISTS `knowledge_graph_edges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` text NOT NULL,
	`target_id` text NOT NULL,
	`relationship_type` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `knowledge_graph_nodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_id`) REFERENCES `knowledge_graph_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Create card metadata table
CREATE TABLE IF NOT EXISTS `card_metadata` (
	`card_id` integer PRIMARY KEY NOT NULL,
	`subject` text,
	`organ_system` text,
	`difficulty` text,
	`high_yield_score` real DEFAULT 0.5,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Create explanation cache table
CREATE TABLE IF NOT EXISTS `explanation_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`card_id` integer NOT NULL,
	`explanation_type` text NOT NULL,
	`content` text NOT NULL,
	`hash` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Create batch jobs table
CREATE TABLE IF NOT EXISTS `batch_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`total_items` integer DEFAULT 0 NOT NULL,
	`completed_items` integer DEFAULT 0 NOT NULL,
	`result` text,
	`error` text,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);