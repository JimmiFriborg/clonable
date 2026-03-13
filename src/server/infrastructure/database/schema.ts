import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projectsTable = sqliteTable("projects", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  summary: text("summary").notNull(),
  status: text("status").notNull(),
  currentFocus: text("current_focus").notNull(),
  vision: text("vision").notNull(),
  plannerState: text("planner_state").notNull(),
  plannerMessage: text("planner_message"),
  targetUser: text("target_user").notNull(),
  ideaPrompt: text("idea_prompt").notNull(),
  stackPreferences: text("stack_preferences").notNull(),
  constraints: text("constraints").notNull(),
  workspacePath: text("workspace_path").notNull(),
  repoProvider: text("repo_provider").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const mvpDefinitionsTable = sqliteTable("mvp_definitions", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  goalStatement: text("goal_statement").notNull(),
  summary: text("summary").notNull(),
  successDefinition: text("success_definition").notNull(),
  laterScope: text("later_scope").notNull(),
  boundaryReasoning: text("boundary_reasoning").notNull(),
  constraints: text("constraints").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const phasesTable = sqliteTable("phases", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  goal: text("goal").notNull(),
  status: text("status").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const featuresTable = sqliteTable("features", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  phaseId: text("phase_id")
    .notNull()
    .references(() => phasesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  status: text("status").notNull(),
  priority: text("priority").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const tasksTable = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  phaseId: text("phase_id")
    .notNull()
    .references(() => phasesTable.id, { onDelete: "cascade" }),
  featureId: text("feature_id")
    .notNull()
    .references(() => featuresTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull(),
  priority: text("priority").notNull(),
  assigneeAgentId: text("assignee_agent_id"),
  dependencies: text("dependencies").notNull(),
  blockers: text("blockers").notNull(),
  acceptanceCriteria: text("acceptance_criteria").notNull(),
  relatedFiles: text("related_files").notNull(),
  artifacts: text("artifacts").notNull(),
  history: text("history").notNull(),
  completedAt: text("completed_at"),
  sortOrder: integer("sort_order").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const agentsTable = sqliteTable("agents", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  model: text("model").notNull(),
  status: text("status").notNull(),
  instructionsSummary: text("instructions_summary").notNull(),
  permissions: text("permissions").notNull(),
  boundaries: text("boundaries").notNull(),
  escalationRules: text("escalation_rules").notNull(),
  currentTaskId: text("current_task_id"),
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const eventsTable = sqliteTable("events", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  summary: text("summary").notNull(),
  reason: text("reason").notNull(),
  payload: text("payload").notNull(),
  createdAt: text("created_at").notNull(),
});

export const agentRunsTable = sqliteTable("agent_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  agentId: text("agent_id")
    .notNull()
    .references(() => agentsTable.id, { onDelete: "cascade" }),
  taskId: text("task_id"),
  status: text("status").notNull(),
  summary: text("summary").notNull(),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
});

export const workspaceStateTable = sqliteTable("workspace_state", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  rootPath: text("root_path").notNull(),
  repoProvider: text("repo_provider").notNull(),
  branch: text("branch").notNull(),
  lastCommit: text("last_commit").notNull(),
  dirtyFiles: text("dirty_files").notNull(),
  files: text("files").notNull(),
});

export const previewStateTable = sqliteTable("preview_state", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  command: text("command").notNull(),
  port: integer("port").notNull(),
  url: text("url").notNull(),
  pid: integer("pid"),
  logPath: text("log_path"),
  lastExitCode: integer("last_exit_code"),
  lastRestartedAt: text("last_restarted_at"),
  recentLogs: text("recent_logs").notNull(),
});

export const schema = {
  projectsTable,
  mvpDefinitionsTable,
  phasesTable,
  featuresTable,
  tasksTable,
  agentsTable,
  eventsTable,
  agentRunsTable,
  workspaceStateTable,
  previewStateTable,
};
