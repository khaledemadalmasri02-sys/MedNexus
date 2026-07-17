CREATE TABLE `studypilot_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`title` text NOT NULL,
	`daily_minutes` integer NOT NULL,
	`deadline` integer NOT NULL,
	`schedule_json` text NOT NULL,
	`module_deck_ids` text NOT NULL,
	`generated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
