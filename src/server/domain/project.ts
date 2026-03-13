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

export type TaskStatus = (typeof taskStatusOrder)[number];
export type ProjectStatus = (typeof projectStatusOrder)[number];
export type Priority = (typeof priorityOrder)[number];
export type AgentStatus = (typeof agentStatusOrder)[number];

export interface PhaseRecord {
  id: string;
  title: string;
  goal: string;
  status: "Planned" | "In Progress" | "Done";
  sortOrder: number;
}

export interface FeatureRecord {
  id: string;
  phaseId: string;
  title: string;
  summary: string;
  status: "Planned" | "In Progress" | "Done";
  priority: Priority;
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
  type: "task" | "agent" | "workspace" | "system";
  summary: string;
  reason: string;
}

export interface AgentRunRecord {
  id: string;
  agentId: string;
  taskId?: string;
  status: "Running" | "Succeeded" | "Failed";
  summary: string;
  startedAt: string;
  endedAt?: string;
}

export interface WorkspaceFileRecord {
  path: string;
  kind: "dir" | "file";
  changed?: boolean;
}

export interface PreviewRecord {
  status: "Running" | "Stopped" | "Errored";
  command: string;
  port: number;
  url: string;
  lastRestartedAt?: string;
  recentLogs: Array<{
    at: string;
    line: string;
  }>;
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
