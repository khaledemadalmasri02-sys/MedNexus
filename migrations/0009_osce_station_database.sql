CREATE TABLE `osce_attempt_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attempt_id` integer NOT NULL,
	`criterion_id` integer,
	`question_asked` text,
	`patient_response` text,
	`points_awarded` integer,
	`feedback` text,
	`is_missed` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `osce_attempts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`criterion_id`) REFERENCES `osce_scoring_criteria`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `osce_competency_profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`communication` integer DEFAULT 0 NOT NULL,
	`history` integer DEFAULT 0 NOT NULL,
	`clinical_reasoning` integer DEFAULT 0 NOT NULL,
	`management` integer DEFAULT 0 NOT NULL,
	`professionalism` integer DEFAULT 0 NOT NULL,
	`emergency_management` integer DEFAULT 0 NOT NULL,
	`last_updated` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `osce_critical_patterns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`station_id` integer NOT NULL,
	`pattern` text NOT NULL,
	`description` text,
	`severity` text DEFAULT 'critical' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`station_id`) REFERENCES `osce_stations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `osce_difficulty_factors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`station_id` integer NOT NULL,
	`patient_complexity` integer DEFAULT 3 NOT NULL,
	`communication_difficulty` integer DEFAULT 3 NOT NULL,
	`time_pressure` integer DEFAULT 2 NOT NULL,
	`clinical_reasoning` integer DEFAULT 3 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`station_id`) REFERENCES `osce_stations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `osce_fail_conditions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`station_id` integer NOT NULL,
	`condition` text NOT NULL,
	`severity` text DEFAULT 'critical' NOT NULL,
	`points_deducted` integer DEFAULT 10 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`station_id`) REFERENCES `osce_stations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `osce_hidden_clinical_info` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_profile_id` integer NOT NULL,
	`diagnosis` text,
	`symptoms` text DEFAULT '{}',
	`risk_factors` text DEFAULT '[]',
	`red_flags` text DEFAULT '[]',
	`vital_signs` text DEFAULT '{}',
	`pain_description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`patient_profile_id`) REFERENCES `osce_patient_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `osce_analytics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`station_id` integer NOT NULL,
	`total_attempts` integer DEFAULT 0 NOT NULL,
	`total_completions` integer DEFAULT 0 NOT NULL,
	`average_score` real DEFAULT 0,
	`most_failed_category` text,
	`weak_areas` text DEFAULT '[]',
	`last_updated` integer NOT NULL,
	FOREIGN KEY (`station_id`) REFERENCES `osce_stations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `osce_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`exam_id` integer NOT NULL,
	`station_id` integer NOT NULL,
	`patient_profile_id` integer NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`duration_seconds` integer,
	`conversation_log` text DEFAULT '[]',
	`score` real,
	`scores_by_category` text DEFAULT '{}',
	`feedback` text DEFAULT '{}',
	`strengths` text DEFAULT '[]',
	`weaknesses` text DEFAULT '[]',
	`improvement_plan` text,
	`examiner_notes` text DEFAULT '{}',
	`is_completed` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exam_id`) REFERENCES `osce_exams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`station_id`) REFERENCES `osce_stations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_profile_id`) REFERENCES `osce_patient_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `osce_clinical_heatmap` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`history_taking` integer DEFAULT 0 NOT NULL,
	`communication` integer DEFAULT 0 NOT NULL,
	`clinical_reasoning` integer DEFAULT 0 NOT NULL,
	`management` integer DEFAULT 0 NOT NULL,
	`emergency_response` integer DEFAULT 0 NOT NULL,
	`professional_skills` integer DEFAULT 0 NOT NULL,
	`last_updated` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `osce_confidence_tracking` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`attempt_id` integer NOT NULL,
	`confidence_rating` integer NOT NULL,
	`self_score` integer,
	`actual_score` integer,
	`calibration_gap` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`attempt_id`) REFERENCES `osce_attempts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `osce_exam_readiness` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`readiness_score` real NOT NULL,
	`pass_probability` text NOT NULL,
	`critical_errors` integer DEFAULT 0 NOT NULL,
	`consistency_score` real NOT NULL,
	`recent_scores` text DEFAULT '[]' NOT NULL,
	`last_calculated` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `osce_exam_readiness_user_id_unique` ON `osce_exam_readiness` (`user_id`);--> statement-breakpoint
CREATE TABLE `osce_exams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`station_ids` text DEFAULT '[]' NOT NULL,
	`total_time_minutes` integer DEFAULT 120 NOT NULL,
	`is_mock` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `osce_knowledge_detection` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`station_id` integer NOT NULL,
	`knowledge_deficit` text DEFAULT 'none' NOT NULL,
	`skill_deficit` text DEFAULT 'none' NOT NULL,
	`related_flashcards` text DEFAULT '[]' NOT NULL,
	`related_questions` text DEFAULT '[]' NOT NULL,
	`detected_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`station_id`) REFERENCES `osce_stations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `osce_practice_plan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`day_number` integer NOT NULL,
	`stations` text DEFAULT '[]' NOT NULL,
	`focus_areas` text DEFAULT '[]' NOT NULL,
	`difficulty_level` text DEFAULT 'medium' NOT NULL,
	`generated_at` integer NOT NULL,
	`completed_at` integer,
	`is_completed` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `osce_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`station_id` integer NOT NULL,
	`attempts_count` integer DEFAULT 0 NOT NULL,
	`best_score` real,
	`average_score` real,
	`last_attempt_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`station_id`) REFERENCES `osce_stations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `osce_progress_timeline` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`average_score` real,
	`attempts_count` integer DEFAULT 0 NOT NULL,
	`stations_practiced` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `osce_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`voice_enabled` integer DEFAULT true NOT NULL,
	`auto_submit_enabled` integer DEFAULT false NOT NULL,
	`show_hints` integer DEFAULT true NOT NULL,
	`difficulty_filter` text DEFAULT 'all' NOT NULL,
	`preferred_station_types` text DEFAULT '[]',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `osce_settings_user_id_unique` ON `osce_settings` (`user_id`);--> statement-breakpoint
CREATE TABLE `osce_spaced_repetition` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`station_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`next_review_at` integer,
	`last_reviewed_at` integer,
	`ease_factor` real DEFAULT 2.5 NOT NULL,
	`interval_days` integer DEFAULT 0 NOT NULL,
	`repetitions` integer DEFAULT 0 NOT NULL,
	`quality` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`station_id`) REFERENCES `osce_stations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `osce_patient_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`age` integer NOT NULL,
	`gender` text NOT NULL,
	`occupation` text,
	`personality` text NOT NULL,
	`communication_style` text NOT NULL,
	`emotional_state` text DEFAULT 'neutral' NOT NULL,
	`background` text,
	`medical_history` text DEFAULT '[]',
	`medications` text DEFAULT '[]',
	`allergies` text DEFAULT '[]',
	`family_history` text DEFAULT '[]',
	`social_history` text DEFAULT '[]',
	`hearing_difficulty` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `osce_scoring_criteria` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`station_id` integer NOT NULL,
	`category` text NOT NULL,
	`sub_category` text,
	`max_points` integer NOT NULL,
	`description` text NOT NULL,
	`criteria_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`station_id`) REFERENCES `osce_stations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `osce_skill_recommendations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`station_id` integer NOT NULL,
	`reason` text NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`is_completed` integer DEFAULT false NOT NULL,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`station_id`) REFERENCES `osce_stations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `osce_specialties` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `osce_specialties_name_unique` ON `osce_specialties` (`name`);--> statement-breakpoint
CREATE TABLE `osce_station_patients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`station_id` integer NOT NULL,
	`patient_profile_id` integer NOT NULL,
	`scenario_variants` text DEFAULT '[]',
	`created_at` integer NOT NULL,
	FOREIGN KEY (`station_id`) REFERENCES `osce_stations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`patient_profile_id`) REFERENCES `osce_patient_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `osce_station_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `osce_station_types_name_unique` ON `osce_station_types` (`name`);--> statement-breakpoint
CREATE TABLE `osce_station_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`station_id` integer NOT NULL,
	`version` integer NOT NULL,
	`created_by_user_id` text,
	`change_notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`station_id`) REFERENCES `osce_stations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `osce_station_weights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`station_id` integer NOT NULL,
	`communication` integer DEFAULT 20 NOT NULL,
	`history` integer DEFAULT 30 NOT NULL,
	`clinical_reasoning` integer DEFAULT 20 NOT NULL,
	`management` integer DEFAULT 20 NOT NULL,
	`professionalism` integer DEFAULT 10 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`station_id`) REFERENCES `osce_stations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `osce_stations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`specialty_id` integer NOT NULL,
	`subspecialty` text,
	`station_type_id` integer NOT NULL,
	`difficulty` text DEFAULT 'medium' NOT NULL,
	`difficulty_level` integer DEFAULT 3 NOT NULL,
	`duration` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`candidate_instructions` text NOT NULL,
	`patient_instructions` text NOT NULL,
	`hidden_diagnosis` text,
	`expected_questions` text DEFAULT '[]',
	`expected_findings` text DEFAULT '[]',
	`marking_scheme` text DEFAULT '{}' NOT NULL,
	`learning_objectives` text DEFAULT '[]',
	`references` text DEFAULT '[]',
	`clinical_pathway` text DEFAULT '[]',
	`is_active` integer DEFAULT true NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	`created_by_user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`specialty_id`) REFERENCES `osce_specialties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`station_type_id`) REFERENCES `osce_station_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `osce_student_learning_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`clinical_skills` text DEFAULT '{}' NOT NULL,
	`communication_skills` text DEFAULT '{}' NOT NULL,
	`history_skills` text DEFAULT '{}' NOT NULL,
	`clinical_reasoning` integer DEFAULT 0 NOT NULL,
	`management` integer DEFAULT 0 NOT NULL,
	`emergency_response` integer DEFAULT 0 NOT NULL,
	`professional_skills` integer DEFAULT 0 NOT NULL,
	`weak_topics` text DEFAULT '[]' NOT NULL,
	`strengths` text DEFAULT '[]' NOT NULL,
	`last_updated` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `osce_student_learning_profiles_user_id_unique` ON `osce_student_learning_profiles` (`user_id`);