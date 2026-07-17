CREATE TABLE `achievements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`icon` text NOT NULL,
	`unlocked_at` integer NOT NULL,
	`seen` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `agent_cache_analytics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent_id` text NOT NULL,
	`date` text NOT NULL,
	`total_questions` integer DEFAULT 0 NOT NULL,
	`memory_hits` integer DEFAULT 0 NOT NULL,
	`knowledge_hits` integer DEFAULT 0 NOT NULL,
	`db_cache_hits` integer DEFAULT 0 NOT NULL,
	`api_calls` integer DEFAULT 0 NOT NULL,
	`avg_response_ms` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `agent_knowledge` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent_id` text NOT NULL,
	`category` text DEFAULT 'general' NOT NULL,
	`question` text NOT NULL,
	`keywords` text DEFAULT '[]' NOT NULL,
	`answer` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `agent_response_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent_id` text NOT NULL,
	`question_hash` text NOT NULL,
	`question_original` text NOT NULL,
	`answer` text NOT NULL,
	`source` text DEFAULT 'ai' NOT NULL,
	`confidence` integer DEFAULT 0.8 NOT NULL,
	`hit_count` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`last_hit_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `agent_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mode_id` text NOT NULL,
	`workspace_id` text,
	`status` text DEFAULT 'idle' NOT NULL,
	`messages` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `agent_usage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`agent_id` text NOT NULL,
	`tokens_used` integer DEFAULT 0 NOT NULL,
	`duration_ms` integer,
	`success` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `article_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` integer NOT NULL,
	`topic` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`outline` text,
	`content_markdown` text,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`resource` text,
	`resource_id` text,
	`details` text,
	`ip_address` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `card_progress` (
	`card_id` integer PRIMARY KEY NOT NULL,
	`user_id` text,
	`ease_factor` integer DEFAULT 2.5 NOT NULL,
	`interval_days` integer DEFAULT 0 NOT NULL,
	`repetitions` integer DEFAULT 0 NOT NULL,
	`next_review_date` text DEFAULT (date('now')) NOT NULL,
	`last_studied_at` integer,
	`total_studied_count` integer DEFAULT 0 NOT NULL,
	`known_count` integer DEFAULT 0 NOT NULL,
	`unknown_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cards` (
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
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`deck_context` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `deck_tags` (
	`deck_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `decks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`parent_id` integer,
	`kind` text DEFAULT 'deck' NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `email_verification_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_verification_tokens_token_unique` ON `email_verification_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `error_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`error_type` text NOT NULL,
	`error_code` text,
	`model` text NOT NULL,
	`operation` text NOT NULL,
	`input_hash` text NOT NULL,
	`input_preview` text,
	`error_message` text NOT NULL,
	`error_stack` text,
	`context` text,
	`resolved` integer DEFAULT false NOT NULL,
	`resolution_notes` text,
	`fix_pattern` text,
	`occurrence_count` integer DEFAULT 1 NOT NULL,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`title` text NOT NULL,
	`deck_ids` text DEFAULT '[]' NOT NULL,
	`questions` text DEFAULT '[]' NOT NULL,
	`answers` text,
	`score` integer,
	`total_questions` integer DEFAULT 0 NOT NULL,
	`duration_minutes` integer,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`rating` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `free_tier_usage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`identifier` text NOT NULL,
	`deck_count` integer DEFAULT 0 NOT NULL,
	`last_reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `free_tier_usage_identifier_unique` ON `free_tier_usage` (`identifier`);--> statement-breakpoint
CREATE TABLE `generation_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`type` text NOT NULL,
	`model` text,
	`prompt_tokens` integer,
	`completion_tokens` integer,
	`duration_ms` integer,
	`success` integer DEFAULT true NOT NULL,
	`error_message` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `group_study_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`host_user_id` text,
	`deck_ids` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`current_question_index` integer DEFAULT 0 NOT NULL,
	`questions` text DEFAULT '[]' NOT NULL,
	`participants` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`host_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `milestone_acknowledgments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`milestone_type` text NOT NULL,
	`milestone_value` integer NOT NULL,
	`acknowledged_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mind_maps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deck_id` integer,
	`title` text NOT NULL,
	`data` text NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`action_url` text,
	`scheduled_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_tokens_token_unique` ON `password_reset_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `qbank_tags` (
	`qbank_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`qbank_id`) REFERENCES `qbanks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `qbanks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`parent_id` integer,
	`user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`qbank_id` integer NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`choices` text,
	`correct_index` integer,
	`tags` text,
	`page_number` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`qbank_id`) REFERENCES `qbanks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`data` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `study_exams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`title` text NOT NULL,
	`subject` text,
	`exam_date` integer NOT NULL,
	`color` text DEFAULT '#06b6d4' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `study_plan_instances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`user_id` text,
	`occurrence_date` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_hour` integer NOT NULL,
	`duration_minutes` integer DEFAULT 60 NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`color` text DEFAULT '#06b6d4' NOT NULL,
	`deck_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `study_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `study_plan_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`description` text,
	`sessions` text DEFAULT '[]' NOT NULL,
	`schedule_type` text DEFAULT 'weekly' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`last_generated_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `study_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`title` text NOT NULL,
	`description` text,
	`color` text DEFAULT '#06b6d4' NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_hour` integer NOT NULL,
	`duration_minutes` integer DEFAULT 60 NOT NULL,
	`deck_id` integer,
	`recurrence` text DEFAULT 'none' NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`plan_id` integer,
	`deck_id` integer,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`duration_minutes` integer,
	`cards_studied` integer DEFAULT 0 NOT NULL,
	`known_count` integer,
	`unknown_count` integer,
	`focus_rating` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`plan_id`) REFERENCES `study_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `support_conversations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`session_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`rating` integer,
	`feedback` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `support_knowledge` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text DEFAULT 'general' NOT NULL,
	`question` text NOT NULL,
	`keywords` text DEFAULT '[]' NOT NULL,
	`answer` text NOT NULL,
	`answer_plain` text NOT NULL,
	`related_questions` text DEFAULT '[]',
	`views` integer DEFAULT 0 NOT NULL,
	`helpful_count` integer DEFAULT 0 NOT NULL,
	`not_helpful_count` integer DEFAULT 0 NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `support_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversation_id` integer NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`source` text DEFAULT 'knowledge',
	`knowledge_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `support_conversations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`knowledge_id`) REFERENCES `support_knowledge`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#06B6D4' NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `terminal_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`workspace_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`last_activity_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`parent_id` integer,
	`user_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`daily_goal_minutes` integer DEFAULT 20 NOT NULL,
	`daily_goal_cards` integer DEFAULT 30 NOT NULL,
	`reminder_time` text,
	`accent_color` text DEFAULT 'cyan' NOT NULL,
	`dashboard_layout` text,
	`density` text DEFAULT 'comfortable' NOT NULL,
	`sound_enabled` integer DEFAULT false NOT NULL,
	`streak_freeze_used_at` integer,
	`theme` text DEFAULT 'dark' NOT NULL,
	`animations_enabled` integer DEFAULT true NOT NULL,
	`font_size` text DEFAULT 'medium' NOT NULL,
	`default_style` text DEFAULT 'modern' NOT NULL,
	`default_mode` text DEFAULT 'combined' NOT NULL,
	`auto_tts` integer DEFAULT false NOT NULL,
	`chunk_size` integer DEFAULT 3 NOT NULL,
	`card_order` text DEFAULT 'sequential' NOT NULL,
	`auto_reveal` integer DEFAULT false NOT NULL,
	`auto_reveal_seconds` integer DEFAULT 5 NOT NULL,
	`show_explanation` integer DEFAULT true NOT NULL,
	`streak_freeze` integer DEFAULT true NOT NULL,
	`email_notifications` integer DEFAULT true NOT NULL,
	`email_weekly_summary` integer DEFAULT true NOT NULL,
	`email_streak_alert` integer DEFAULT true NOT NULL,
	`push_notifications` integer DEFAULT true NOT NULL,
	`push_reminder_time` text DEFAULT '18:00' NOT NULL,
	`push_review_due` integer DEFAULT true NOT NULL,
	`push_session_complete` integer DEFAULT true NOT NULL,
	`in_app_sounds` integer DEFAULT false NOT NULL,
	`sound_volume` integer DEFAULT 70 NOT NULL,
	`ambient_enabled` integer DEFAULT true NOT NULL,
	`custom_cursor_enabled` integer DEFAULT true NOT NULL,
	`ripples_enabled` integer DEFAULT true NOT NULL,
	`animation_speed` integer DEFAULT 100 NOT NULL,
	`reduce_motion` integer DEFAULT false NOT NULL,
	`study_buddy_enabled` integer DEFAULT true NOT NULL,
	`smart_review_enabled` integer DEFAULT true NOT NULL,
	`deck_doctor_enabled` integer DEFAULT true NOT NULL,
	`exam_simulator_enabled` integer DEFAULT true NOT NULL,
	`content_summarizer_enabled` integer DEFAULT true NOT NULL,
	`mnemonic_generator_enabled` integer DEFAULT true NOT NULL,
	`progress_coach_enabled` integer DEFAULT true NOT NULL,
	`image_analyzer_enabled` integer DEFAULT true NOT NULL,
	`voice_tutor_enabled` integer DEFAULT true NOT NULL,
	`collaborative_study_enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`email_verified` integer DEFAULT false,
	`first_name` text,
	`last_name` text,
	`profile_image_url` text,
	`is_pro` integer DEFAULT false,
	`auth_provider` text DEFAULT 'local',
	`oauth_provider_id` text,
	`password_hash` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
