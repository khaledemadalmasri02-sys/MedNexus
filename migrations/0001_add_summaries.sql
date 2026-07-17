CREATE TABLE `summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`title` text,
	`style` text,
	`source_text` text,
	`summary_markdown` text,
	`summary_json` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error` text,
	`word_count` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
