import type {
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
  TaskCreateInput,
  TaskStatusUpdateInput,
  WorkspaceRecord,
} from "@/server/domain/project";

export interface ProjectRepository {
  listProjects(): Promise<ProjectListItem[]>;
  getProject(projectId: string): Promise<ProjectRecord | undefined>;
  getProjectDashboard(projectId: string): Promise<ProjectDashboardModel | undefined>;
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
  updateTaskStatus(
    projectId: string,
    taskId: string,
    input: TaskStatusUpdateInput,
  ): Promise<ProjectRecord | undefined>;
  updateWorkspaceState(
    projectId: string,
    workspace: WorkspaceRecord,
  ): Promise<ProjectRecord | undefined>;
  updatePreviewState(
    projectId: string,
    preview: PreviewRecord,
  ): Promise<ProjectRecord | undefined>;
  recordEvent(input: EventInput): Promise<void>;
  seedDemoProject(project: ProjectRecord): Promise<void>;
}
