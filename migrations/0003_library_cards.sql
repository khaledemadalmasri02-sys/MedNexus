-- Reconstructed migration 0003: adds AI/source columns to the `cards` table.
-- This file was previously missing, which left the migration journal out of sync
-- with the physical database and caused subsequent `wrangler d1 migrations apply`
-- to fail. The StudyPilot Library tables are created separately in 0004.
ALTER TABLE `cards` ADD COLUMN `ai_front` text;
--> statement-breakpoint
ALTER TABLE `cards` ADD COLUMN `ai_back` text;
--> statement-breakpoint
ALTER TABLE `cards` ADD COLUMN `ai_explanation` text;
--> statement-breakpoint
ALTER TABLE `cards` ADD COLUMN `ai_generated` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `cards` ADD COLUMN `source` text DEFAULT 'heuristic' NOT NULL;
