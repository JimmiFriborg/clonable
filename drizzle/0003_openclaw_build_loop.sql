ALTER TABLE `projects` ADD `default_chat_bot_id` text NOT NULL DEFAULT 'mvp-guide';--> statement-breakpoint
ALTER TABLE `agents` ADD `runtime_backend` text NOT NULL DEFAULT 'provider';--> statement-breakpoint
ALTER TABLE `agents` ADD `provider` text;--> statement-breakpoint
ALTER TABLE `agents` ADD `fallback_providers` text NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `agents` ADD `openclaw_bot_id` text;--> statement-breakpoint
CREATE TABLE `project_chat_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`bot_id` text NOT NULL,
	`title` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE `project_chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`session_id` text NOT NULL,
	`bot_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`suggestions` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `project_chat_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
