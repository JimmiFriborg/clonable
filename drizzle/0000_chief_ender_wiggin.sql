CREATE TABLE `agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`task_id` text,
	`status` text NOT NULL,
	`summary` text NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`model` text NOT NULL,
	`status` text NOT NULL,
	`instructions_summary` text NOT NULL,
	`permissions` text NOT NULL,
	`boundaries` text NOT NULL,
	`escalation_rules` text NOT NULL,
	`current_task_id` text,
	`is_system` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`type` text NOT NULL,
	`summary` text NOT NULL,
	`reason` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `features` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`phase_id` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`status` text NOT NULL,
	`priority` text NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`phase_id`) REFERENCES `phases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mvp_definitions` (
	`project_id` text PRIMARY KEY NOT NULL,
	`goal_statement` text NOT NULL,
	`summary` text NOT NULL,
	`success_definition` text NOT NULL,
	`later_scope` text NOT NULL,
	`boundary_reasoning` text NOT NULL,
	`constraints` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `phases` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`goal` text NOT NULL,
	`status` text NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `preview_state` (
	`project_id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`command` text NOT NULL,
	`port` integer NOT NULL,
	`url` text NOT NULL,
	`last_restarted_at` text,
	`recent_logs` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`summary` text NOT NULL,
	`status` text NOT NULL,
	`current_focus` text NOT NULL,
	`vision` text NOT NULL,
	`planner_state` text NOT NULL,
	`planner_message` text,
	`target_user` text NOT NULL,
	`idea_prompt` text NOT NULL,
	`stack_preferences` text NOT NULL,
	`constraints` text NOT NULL,
	`workspace_path` text NOT NULL,
	`repo_provider` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_unique` ON `projects` (`slug`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`phase_id` text NOT NULL,
	`feature_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`status` text NOT NULL,
	`priority` text NOT NULL,
	`assignee_agent_id` text,
	`dependencies` text NOT NULL,
	`blockers` text NOT NULL,
	`acceptance_criteria` text NOT NULL,
	`related_files` text NOT NULL,
	`artifacts` text NOT NULL,
	`history` text NOT NULL,
	`completed_at` text,
	`sort_order` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`phase_id`) REFERENCES `phases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `workspace_state` (
	`project_id` text PRIMARY KEY NOT NULL,
	`root_path` text NOT NULL,
	`repo_provider` text NOT NULL,
	`branch` text NOT NULL,
	`last_commit` text NOT NULL,
	`dirty_files` text NOT NULL,
	`files` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
