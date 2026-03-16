ALTER TABLE `projects` ADD `definition_of_done` text NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `tasks` ADD `state` text NOT NULL DEFAULT 'Backlog';--> statement-breakpoint
ALTER TABLE `tasks` ADD `owner_agent_id` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `last_updated` text NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';--> statement-breakpoint
ALTER TABLE `tasks` ADD `notes` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `tasks` ADD `collective_qa` integer;--> statement-breakpoint
ALTER TABLE `tasks` ADD `next_role` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `parent_task_id` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `sub_task_ids` text NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `tasks` ADD `optional_dependencies` text NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `tasks` ADD `blocker_reason` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `waiting_reason` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `last_implementation_owner_agent_id` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `requires_user` integer NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `tasks` ADD `review_date` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `change_log` text NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `tasks` ADD `rejection_log` text NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `agents` ADD `policy_role` text NOT NULL DEFAULT 'builder';--> statement-breakpoint
ALTER TABLE `agents` ADD `enabled` integer NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `agents` ADD `instructions` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `agents` ADD `wip_limit` integer;--> statement-breakpoint
ALTER TABLE `agents` ADD `can_write_workspace` integer NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `agent_runs` ADD `trigger` text NOT NULL DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE `agent_runs` ADD `reason` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `agent_runs` ADD `input_summary` text;--> statement-breakpoint
ALTER TABLE `agent_runs` ADD `output_summary` text;--> statement-breakpoint
ALTER TABLE `agent_runs` ADD `error_message` text;--> statement-breakpoint
ALTER TABLE `agent_runs` ADD `changed_files` text NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `agent_runs` ADD `artifacts` text NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `agent_runs` ADD `branch` text;--> statement-breakpoint
ALTER TABLE `agent_runs` ADD `lease_owner` text;--> statement-breakpoint
ALTER TABLE `agent_runs` ADD `lease_expires_at` text;--> statement-breakpoint
ALTER TABLE `agent_runs` ADD `created_at` text NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';--> statement-breakpoint
CREATE TABLE `project_runtime` (
	`project_id` text PRIMARY KEY NOT NULL,
	`orchestration_enabled` integer DEFAULT false NOT NULL,
	`runner_status` text NOT NULL,
	`active_write_run_id` text,
	`last_tick_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
