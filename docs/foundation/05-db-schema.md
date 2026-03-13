# 5. DB Schema

## Database choice

SQLite is the V1 default because it improves first-run simplicity, local portability, and self-hosting ergonomics.

## Core tables

### `projects`

- `id`
- `slug`
- `name`
- `summary`
- `vision`
- `status`
- `workspace_path`
- `repo_provider`
- `created_at`
- `updated_at`

### `project_constraints`

- `id`
- `project_id`
- `stack_preferences`
- `non_goals`
- `delivery_constraints`
- `notes`

### `mvp_definitions`

- `id`
- `project_id`
- `goal_statement`
- `mvp_summary`
- `mvp_success_definition`
- `later_scope_summary`
- `boundary_reasoning`
- `created_at`
- `updated_at`

### `phases`

- `id`
- `project_id`
- `title`
- `goal`
- `sort_order`
- `status`
- `progress_percent`

### `features`

- `id`
- `project_id`
- `phase_id`
- `title`
- `summary`
- `status`
- `priority`
- `progress_percent`

### `tasks`

- `id`
- `project_id`
- `phase_id`
- `feature_id`
- `parent_task_id`
- `title`
- `description`
- `status`
- `priority`
- `assignee_agent_id`
- `size`
- `retry_count`
- `started_at`
- `completed_at`
- `created_at`
- `updated_at`

### `task_dependencies`

- `id`
- `task_id`
- `depends_on_task_id`
- `type`

### `task_blockers`

- `id`
- `task_id`
- `reason`
- `blocking_task_id`
- `blocking_event_id`
- `status`
- `created_at`
- `resolved_at`

### `task_acceptance_criteria`

- `id`
- `task_id`
- `text`
- `sort_order`
- `is_met`

### `task_artifacts`

- `id`
- `task_id`
- `kind`
- `path`
- `label`
- `metadata_json`
- `created_at`

### `task_files`

- `id`
- `task_id`
- `file_path`
- `change_type`

### `task_history`

- `id`
- `task_id`
- `actor_type`
- `actor_id`
- `from_status`
- `to_status`
- `reason`
- `metadata_json`
- `created_at`

### `agents`

- `id`
- `project_id`
- `name`
- `role`
- `model`
- `instructions`
- `permissions_json`
- `boundaries_json`
- `escalation_rules_json`
- `is_enabled`
- `is_system`

### `agent_runs`

- `id`
- `project_id`
- `agent_id`
- `task_id`
- `status`
- `started_at`
- `ended_at`
- `summary`
- `input_snapshot_json`
- `output_snapshot_json`

### `events`

- `id`
- `project_id`
- `entity_type`
- `entity_id`
- `event_type`
- `source`
- `reason`
- `payload_json`
- `created_at`

### `preview_sessions`

- `id`
- `project_id`
- `status`
- `command`
- `port`
- `pid`
- `started_at`
- `ended_at`

## Key invariants

- tasks belong to one project
- every task status transition gets a `task_history` row
- every automatic state change gets an `events` row with a reason
- code-affecting runs should reference a task
- only enabled agents can be assigned
