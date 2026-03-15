import type {
  AgentCreateInput,
  AgentRunRecord,
  AgentUpdateInput,
  EventInput,
  FeatureCreateInput,
  PhaseCreateInput,
  PlannerDraft,
  PreviewRecord,
  ProjectDashboardModel,
  ProjectIntakeInput,
  ProjectListItem,
  ProjectMvpUpdateInput,
  ProjectRecord,
  ProjectRuntimeState,
  TaskCreateInput,
  TaskOwnerInput,
  TaskTransitionInput,
  WorkspaceRecord,
} from "@/server/domain/project";

export interface ProjectRepository {
  listProjects(): Promise<ProjectListItem[]>;
  getProject(projectId: string): Promise<ProjectRecord | undefined>;
  getProjectDashboard(projectId: string): Promise<ProjectDashboardModel | undefined>;
  saveProject(project: ProjectRecord): Promise<ProjectRecord>;
  createProject(input: ProjectIntakeInput): Promise<ProjectRecord>;
  savePlannerDraft(projectId: string, draft: PlannerDraft): Promise<ProjectRecord>;
  savePlannerFailure(
    projectId: string,
    reason: string,
    fallback: ProjectMvpUpdateInput,
  ): Promise<ProjectRecord>;
  updateMvpDefinition(
    projectId: string,
    input: ProjectMvpUpdateInput,
  ): Promise<ProjectRecord | undefined>;
  createPhase(
    projectId: string,
    input: PhaseCreateInput,
  ): Promise<ProjectRecord | undefined>;
  createFeature(
    projectId: string,
    input: FeatureCreateInput,
  ): Promise<ProjectRecord | undefined>;
  createTask(
    projectId: string,
    input: TaskCreateInput,
  ): Promise<ProjectRecord | undefined>;
  transitionTask(
    projectId: string,
    taskId: string,
    input: TaskTransitionInput,
  ): Promise<ProjectRecord | undefined>;
  assignTaskOwner(
    projectId: string,
    taskId: string,
    input: TaskOwnerInput,
  ): Promise<ProjectRecord | undefined>;
  createAgent(
    projectId: string,
    input: AgentCreateInput,
  ): Promise<ProjectRecord | undefined>;
  updateAgent(
    projectId: string,
    agentId: string,
    input: AgentUpdateInput,
  ): Promise<ProjectRecord | undefined>;
  updateProjectRuntime(
    projectId: string,
    runtime: ProjectRuntimeState,
  ): Promise<ProjectRecord | undefined>;
  updateWorkspaceState(
    projectId: string,
    workspace: WorkspaceRecord,
  ): Promise<ProjectRecord | undefined>;
  updatePreviewState(
    projectId: string,
    preview: PreviewRecord,
  ): Promise<ProjectRecord | undefined>;
  addAgentRun(projectId: string, run: AgentRunRecord): Promise<ProjectRecord | undefined>;
  updateAgentRun(
    projectId: string,
    runId: string,
    update: Partial<AgentRunRecord>,
  ): Promise<ProjectRecord | undefined>;
  recordEvent(input: EventInput): Promise<void>;
  seedDemoProject(project: ProjectRecord): Promise<void>;
}
