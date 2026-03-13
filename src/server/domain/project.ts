export const taskStatusOrder = [
  "Inbox",
  "Planned",
  "Ready",
  "In Progress",
  "Review",
  "Blocked",
  "Done",
] as const;

export const projectStatusOrder = [
  "Discovery",
  "Planning",
  "Building",
  "Review",
  "Complete",
] as const;

export const priorityOrder = ["P0", "P1", "P2", "P3"] as const;
export const agentStatusOrder = ["active", "ready", "paused"] as const;
export const plannerStateOrder = ["idle", "succeeded", "failed", "manual"] as const;

export type TaskStatus = (typeof taskStatusOrder)[number];
export type ProjectStatus = (typeof projectStatusOrder)[number];
export type Priority = (typeof priorityOrder)[number];
export type AgentStatus = (typeof agentStatusOrder)[number];
export type PlannerState = (typeof plannerStateOrder)[number];
export type PhaseStatus = "Planned" | "In Progress" | "Done";
export type FeatureStatus = "Planned" | "In Progress" | "Done";
export type EventType = "task" | "agent" | "workspace" | "system";
export type AgentRunStatus = "Running" | "Succeeded" | "Failed";

export interface PhaseRecord {
  id: string;
  title: string;
  goal: string;
  status: PhaseStatus;
  sortOrder: number;
}

export interface FeatureRecord {
  id: string;
  phaseId: string;
  title: string;
  summary: string;
  status: FeatureStatus;
  priority: Priority;
  sortOrder: number;
}

export interface TaskHistoryRecord {
  at: string;
  summary: string;
  reason: string;
}

export interface TaskRecord {
  id: string;
  phaseId: string;
  featureId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeAgentId?: string;
  dependencies: string[];
  blockers: string[];
  acceptanceCriteria: string[];
  relatedFiles: string[];
  artifacts: string[];
  history: TaskHistoryRecord[];
  completedAt?: string;
}

export interface AgentRecord {
  id: string;
  name: string;
  role: string;
  model: string;
  status: AgentStatus;
  instructionsSummary: string;
  permissions: string[];
  boundaries: string[];
  escalationRules: string[];
  currentTaskId?: string;
}

export interface EventRecord {
  id: string;
  createdAt: string;
  type: EventType;
  summary: string;
  reason: string;
  payload?: Record<string, unknown>;
}

export interface AgentRunRecord {
  id: string;
  agentId: string;
  taskId?: string;
  status: AgentRunStatus;
  summary: string;
  startedAt: string;
  endedAt?: string;
}

export interface WorkspaceFileRecord {
  path: string;
  kind: "dir" | "file";
  changed?: boolean;
}

export interface PreviewLogRecord {
  at: string;
  line: string;
}

export interface PreviewRecord {
  status: "Running" | "Stopped" | "Errored";
  command: string;
  port: number;
  url: string;
  pid?: number;
  logPath?: string;
  lastExitCode?: number;
  lastRestartedAt?: string;
  recentLogs: PreviewLogRecord[];
}

export interface WorkspaceRecord {
  rootPath: string;
  repoProvider: string;
  branch: string;
  lastCommit: string;
  dirtyFiles: string[];
  files: WorkspaceFileRecord[];
}

export interface MVPDefinitionRecord {
  goalStatement: string;
  summary: string;
  successDefinition: string;
  laterScope: string[];
  boundaryReasoning: string;
  constraints: string[];
}

export interface ProjectRecord {
  id: string;
  slug: string;
  name: string;
  summary: string;
  status: ProjectStatus;
  currentFocus: string;
  vision: string;
  plannerState: PlannerState;
  plannerMessage?: string;
  targetUser: string;
  ideaPrompt: string;
  stackPreferences: string[];
  constraints: string[];
  mvp: MVPDefinitionRecord;
  phases: PhaseRecord[];
  features: FeatureRecord[];
  tasks: TaskRecord[];
  agents: AgentRecord[];
  events: EventRecord[];
  agentRuns: AgentRunRecord[];
  workspace: WorkspaceRecord;
  preview: PreviewRecord;
}

export interface ProjectListItem {
  id: string;
  name: string;
  summary: string;
  status: ProjectStatus;
  progressPercent: number;
  blockedTasks: number;
  currentFocus: string;
  plannerState: PlannerState;
}

export interface ProgressSlice {
  id: string;
  title: string;
  status: string;
  completedTasks: number;
  totalTasks: number;
  progressPercent: number;
}

export interface ProjectDashboardModel {
  project: ProjectRecord;
  currentPhase: PhaseRecord | undefined;
  nextTasks: TaskRecord[];
  blockers: TaskRecord[];
  recentCompletedTasks: TaskRecord[];
  activeAgents: AgentRecord[];
  phaseProgress: ProgressSlice[];
  featureProgress: ProgressSlice[];
  taskColumns: Array<{
    status: TaskStatus;
    tasks: TaskRecord[];
  }>;
  counts: {
    totalTasks: number;
    doneTasks: number;
    blockedTasks: number;
    activeAgents: number;
  };
}

export interface ProjectIntakeInput {
  name: string;
  ideaPrompt: string;
  targetUser: string;
  constraints: string[];
  stackPreferences: string[];
}

export interface PlannerDraftPhase {
  title: string;
  goal: string;
}

export interface PlannerDraftFeature {
  phaseTitle: string;
  title: string;
  summary: string;
  priority: Priority;
}

export interface PlannerDraftTask {
  featureTitle: string;
  title: string;
  description: string;
  priority: Priority;
  acceptanceCriteria: string[];
  dependsOn: string[];
}

export interface PlannerDraft {
  vision: string;
  goalStatement: string;
  mvpSummary: string;
  successDefinition: string;
  laterScope: string[];
  boundaryReasoning: string;
  phases: PlannerDraftPhase[];
  features: PlannerDraftFeature[];
  tasks: PlannerDraftTask[];
}

export interface ProjectMvpUpdateInput {
  vision: string;
  goalStatement: string;
  summary: string;
  successDefinition: string;
  boundaryReasoning: string;
  laterScope: string[];
  constraints: string[];
}

export interface PhaseCreateInput {
  title: string;
  goal: string;
}

export interface FeatureCreateInput {
  phaseId: string;
  title: string;
  summary: string;
  priority: Priority;
}

export interface TaskCreateInput {
  featureId: string;
  title: string;
  description: string;
  priority: Priority;
  acceptanceCriteria: string[];
  dependencies: string[];
}

export interface TaskStatusUpdateInput {
  status: TaskStatus;
}

export interface PreviewSettingsInput {
  command: string;
  port: number;
}

export interface EventInput {
  projectId: string;
  type: EventType;
  summary: string;
  reason: string;
  payload?: Record<string, unknown>;
}
