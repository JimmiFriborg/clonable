import type {
  AgentCreateInput,
  AgentRunRecord,
  AgentUpdateInput,
  EventInput,
  FeatureCreateInput,
  PhaseCreateInput,
  PlannerDraft,
  ProjectDashboardModel,
  ProjectIntakeInput,
  ProjectListItem,
  ProjectMvpUpdateInput,
  ProjectRecord,
  TaskCreateInput,
  TaskOwnerInput,
  TaskTransitionInput,
} from "@/server/domain/project";
import type {
  ProjectChatMessage,
  ProjectChatSession,
} from "@/server/domain/openclaw";

export interface MetadataRepository {
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
  updateProjectDefaultChatBot(
    projectId: string,
    defaultChatBotId: string,
  ): Promise<ProjectRecord | undefined>;
  listProjectChatSessions(projectId: string): Promise<ProjectChatSession[]>;
  getProjectChatSession(
    projectId: string,
    sessionId: string,
  ): Promise<ProjectChatSession | undefined>;
  createProjectChatSession(
    projectId: string,
    session: ProjectChatSession,
  ): Promise<ProjectChatSession | undefined>;
  listProjectChatMessages(
    projectId: string,
    sessionId: string,
  ): Promise<ProjectChatMessage[]>;
  createProjectChatMessage(
    projectId: string,
    message: ProjectChatMessage,
  ): Promise<ProjectChatMessage | undefined>;
  addAgentRun(projectId: string, run: AgentRunRecord): Promise<ProjectRecord | undefined>;
  updateAgentRun(
    projectId: string,
    runId: string,
    update: Partial<AgentRunRecord>,
  ): Promise<ProjectRecord | undefined>;
  recordEvent(input: EventInput): Promise<void>;
  seedDemoProject(project: ProjectRecord): Promise<void>;
}
