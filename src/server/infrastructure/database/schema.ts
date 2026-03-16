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
  defaultChatBotId: text("default_chat_bot_id").notNull().default("mvp-guide"),
  definitionOfDone: text("definition_of_done").notNull(),
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
  status: text("status"),
  state: text("state").notNull(),
  assigneeAgentId: text("assignee_agent_id"),
  ownerAgentId: text("owner_agent_id"),
  priority: text("priority").notNull(),
  blockers: text("blockers"),
  acceptanceCriteria: text("acceptance_criteria").notNull(),
  lastUpdated: text("last_updated").notNull(),
  notes: text("notes").notNull(),
  collectiveQa: integer("collective_qa", { mode: "boolean" }),
  nextRole: text("next_role"),
  parentTaskId: text("parent_task_id"),
  subTaskIds: text("sub_task_ids").notNull(),
  dependencies: text("dependencies").notNull(),
  optionalDependencies: text("optional_dependencies").notNull(),
  blockerReason: text("blocker_reason"),
  waitingReason: text("waiting_reason"),
  lastImplementationOwnerAgentId: text("last_implementation_owner_agent_id"),
  requiresUser: integer("requires_user", { mode: "boolean" }).notNull().default(false),
  reviewDate: text("review_date"),
  history: text("history"),
  changeLog: text("change_log").notNull(),
  rejectionLog: text("rejection_log").notNull(),
  relatedFiles: text("related_files").notNull(),
  artifacts: text("artifacts").notNull(),
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
  policyRole: text("policy_role").notNull(),
  runtimeBackend: text("runtime_backend").notNull().default("provider"),
  provider: text("provider"),
  model: text("model").notNull(),
  fallbackProviders: text("fallback_providers").notNull().default("[]"),
  openclawBotId: text("openclaw_bot_id"),
  status: text("status").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  instructionsSummary: text("instructions_summary").notNull(),
  instructions: text("instructions").notNull(),
  permissions: text("permissions").notNull(),
  boundaries: text("boundaries").notNull(),
  escalationRules: text("escalation_rules").notNull(),
  wipLimit: integer("wip_limit"),
  canWriteWorkspace: integer("can_write_workspace", { mode: "boolean" }).notNull().default(false),
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
  trigger: text("trigger").notNull(),
  summary: text("summary").notNull(),
  reason: text("reason").notNull(),
  inputSummary: text("input_summary"),
  outputSummary: text("output_summary"),
  errorMessage: text("error_message"),
  changedFiles: text("changed_files").notNull(),
  artifacts: text("artifacts").notNull(),
  branch: text("branch"),
  leaseOwner: text("lease_owner"),
  leaseExpiresAt: text("lease_expires_at"),
  createdAt: text("created_at").notNull(),
  startedAt: text("started_at"),
  endedAt: text("ended_at"),
});

export const projectRuntimeTable = sqliteTable("project_runtime", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  orchestrationEnabled: integer("orchestration_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  runnerStatus: text("runner_status").notNull(),
  activeWriteRunId: text("active_write_run_id"),
  lastTickAt: text("last_tick_at"),
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

export const projectChatSessionsTable = sqliteTable("project_chat_sessions", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  botId: text("bot_id").notNull(),
  title: text("title").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const projectChatMessagesTable = sqliteTable("project_chat_messages", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  sessionId: text("session_id")
    .notNull()
    .references(() => projectChatSessionsTable.id, { onDelete: "cascade" }),
  botId: text("bot_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  suggestions: text("suggestions").notNull(),
  createdAt: text("created_at").notNull(),
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
  projectRuntimeTable,
  workspaceStateTable,
  previewStateTable,
  projectChatSessionsTable,
  projectChatMessagesTable,
};
