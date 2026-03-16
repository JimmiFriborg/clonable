import type {
  AgentProviderFallback,
  AgentRuntimeBackend,
  AiProvider,
} from "@/server/domain/ai-provider";

export const taskStateOrder = [
  "Backlog",
  "Ready",
  "In_Progress",
  "Blocked",
  "Waiting",
  "QA_Review",
  "Done",
  "Split_Pending",
] as const;

export const allowedTaskTransitions: Record<string, readonly TaskState[]> = {
  Backlog: ["Ready"],
  Ready: ["In_Progress"],
  In_Progress: ["Ready", "QA_Review", "Blocked", "Waiting", "Split_Pending"],
  QA_Review: ["Done", "Ready"],
  Blocked: ["Ready", "Waiting"],
  Waiting: ["Ready", "Blocked"],
  Split_Pending: ["Blocked", "Ready", "Waiting"],
  Done: taskStateOrder,
};

export const projectStatusOrder = [
  "Discovery",
  "Planning",
  "Building",
  "Review",
  "Complete",
] as const;

export const taskPriorityOrder = ["blocker", "high", "normal", "low"] as const;
export const agentStatusOrder = ["active", "ready", "paused"] as const;
export const plannerStateOrder = ["idle", "succeeded", "failed", "manual"] as const;
export const agentPolicyRoleOrder = [
  "planner",
  "orchestrator",
  "advisory",
  "builder",
  "tester",
  "fixer",
  "documentation",
] as const;
export const agentRunStatusOrder = [
  "Queued",
  "Running",
  "Succeeded",
  "Failed",
  "Cancelled",
] as const;
export const agentRunTriggerOrder = [
  "manual",
  "planner",
  "task_transition",
  "stale",
  "review_date",
  "retry",
  "workspace_failure",
  "preview_failure",
  "runner",
] as const;
export const runnerStatusOrder = ["idle", "running", "paused"] as const;
export const rejectionCodeOrder = [
  "INVALID_TRANSITION",
  "CHECKLIST_FAIL",
  "MISSING_FIELD",
  "WIP_EXCEEDED",
  "UNAUTHORIZED",
  "DEADLOCK_DETECTED",
  "OWNER_MISSING",
  "DEPENDENCY_NOT_DONE",
  "ORCHESTRATOR_REQUIRED",
] as const;

export type TaskState = (typeof taskStateOrder)[number];
export type ProjectStatus = (typeof projectStatusOrder)[number];
export type TaskPriority = (typeof taskPriorityOrder)[number];
export type AgentStatus = (typeof agentStatusOrder)[number];
export type PlannerState = (typeof plannerStateOrder)[number];
export type AgentPolicyRole = (typeof agentPolicyRoleOrder)[number];
export type AgentRunStatus = (typeof agentRunStatusOrder)[number];
export type AgentRunTrigger = (typeof agentRunTriggerOrder)[number];
export type RunnerStatus = (typeof runnerStatusOrder)[number];
export type RejectionCode = (typeof rejectionCodeOrder)[number];
export type PhaseStatus = "Planned" | "In Progress" | "Done";
export type FeatureStatus = "Planned" | "In Progress" | "Done";
export type EventType = "task" | "agent" | "workspace" | "system";

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
  priority: TaskPriority;
  sortOrder: number;
}

export interface TaskChangeLogEntry {
  timestamp: string;
  agentId: string;
  field: string;
  from: string | null;
  to: string | null;
}

export interface TaskRejectionLogEntry {
  timestamp: string;
  agentId: string;
  rejectionReasonCode: RejectionCode;
  rejectionNote: string;
  attemptedTransition?: string;
  attemptedField?: string;
}

export interface TaskRecord {
  id: string;
  phaseId: string;
  featureId: string;
  title: string;
  description: string;
  state: TaskState;
  ownerAgentId?: string;
  priority: TaskPriority;
  acceptanceCriteria: string[];
  lastUpdated: string;
  notes: string;
  collectiveQa?: boolean;
  nextRole?: AgentPolicyRole;
  parentTaskId?: string;
  subTaskIds: string[];
  dependencies: string[];
  optionalDependencies: string[];
  blockerReason?: string;
  waitingReason?: string;
  lastImplementationOwnerAgentId?: string;
  requiresUser: boolean;
  reviewDate?: string;
  changeLog: TaskChangeLogEntry[];
  rejectionLog: TaskRejectionLogEntry[];
  relatedFiles: string[];
  artifacts: string[];
  completedAt?: string;
}

export interface AgentRuntimeConfig {
  runtimeBackend: AgentRuntimeBackend;
  provider?: AiProvider;
  model: string;
  fallbackProviders: AgentProviderFallback[];
  openclawBotId?: string;
}

export interface AgentRecord {
  id: string;
  name: string;
  role: string;
  policyRole: AgentPolicyRole;
  runtimeBackend: AgentRuntimeBackend;
  provider?: AiProvider;
  model: string;
  fallbackProviders: AgentProviderFallback[];
  openclawBotId?: string;
  status: AgentStatus;
  enabled: boolean;
  instructionsSummary: string;
  instructions: string;
  permissions: string[];
  boundaries: string[];
  escalationRules: string[];
  wipLimit?: number;
  canWriteWorkspace: boolean;
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
  trigger: AgentRunTrigger;
  summary: string;
  reason: string;
  inputSummary?: string;
  outputSummary?: string;
  errorMessage?: string;
  changedFiles: string[];
  artifacts: string[];
  branch?: string;
  leaseOwner?: string;
  leaseExpiresAt?: string;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}

export interface ProjectRuntimeState {
  orchestrationEnabled: boolean;
  runnerStatus: RunnerStatus;
  activeWriteRunId?: string;
  lastTickAt?: string;
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
  remoteUrl?: string;
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
  defaultChatBotId: string;
  definitionOfDone: string[];
  mvp: MVPDefinitionRecord;
  phases: PhaseRecord[];
  features: FeatureRecord[];
  tasks: TaskRecord[];
  agents: AgentRecord[];
  events: EventRecord[];
  agentRuns: AgentRunRecord[];
  runtime: ProjectRuntimeState;
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
    state: TaskState;
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
  githubRepositoryUrl?: string;
}

export interface PlannerDraftPhase {
  title: string;
  goal: string;
}

export interface PlannerDraftFeature {
  phaseTitle: string;
  title: string;
  summary: string;
  priority: TaskPriority;
}

export interface PlannerDraftTask {
  featureTitle: string;
  title: string;
  description: string;
  priority: TaskPriority;
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
  definitionOfDone: string[];
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
  definitionOfDone: string[];
}

export interface PhaseCreateInput {
  title: string;
  goal: string;
}

export interface FeatureCreateInput {
  phaseId: string;
  title: string;
  summary: string;
  priority: TaskPriority;
}

export interface TaskCreateInput {
  featureId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  acceptanceCriteria: string[];
  dependencies: string[];
  requiresUser?: boolean;
}

export interface TaskTransitionInput {
  state: TaskState;
  agentId: string;
  note?: string;
  blockerReason?: string;
  waitingReason?: string;
  reviewDate?: string;
}

export interface TaskOwnerInput {
  ownerAgentId?: string;
  agentId: string;
}

export interface AgentCreateInput {
  name: string;
  role: string;
  policyRole: AgentPolicyRole;
  runtimeBackend: AgentRuntimeBackend;
  provider?: AiProvider;
  model: string;
  fallbackProviders: AgentProviderFallback[];
  openclawBotId?: string;
  status: AgentStatus;
  enabled: boolean;
  instructionsSummary: string;
  instructions: string;
  permissions: string[];
  boundaries: string[];
  escalationRules: string[];
  wipLimit?: number;
  canWriteWorkspace: boolean;
}

export type AgentUpdateInput = AgentCreateInput;

export interface AgentRunCreateInput {
  agentId: string;
  taskId?: string;
  trigger: AgentRunTrigger;
  summary: string;
  reason: string;
  inputSummary?: string;
}

export interface PreviewSettingsInput {
  command: string;
  port: number;
}

export interface WorkspaceRemoteInput {
  remoteUrl?: string;
}

export interface BuilderRunResult {
  summary: string;
  changedFiles: string[];
  artifacts: string[];
  outputSummary: string;
}

export interface TesterReviewResult {
  decision: "pass" | "rework" | "block";
  reason: string;
  outputSummary: string;
  artifacts: string[];
}

export interface EventInput {
  projectId: string;
  type: EventType;
  summary: string;
  reason: string;
  payload?: Record<string, unknown>;
}
