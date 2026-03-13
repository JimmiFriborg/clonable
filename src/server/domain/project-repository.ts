import type {
  EventInput,
  PlannerDraft,
  ProjectDashboardModel,
  ProjectIntakeInput,
  ProjectListItem,
  ProjectMvpUpdateInput,
  ProjectRecord,
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
  recordEvent(input: EventInput): Promise<void>;
  seedDemoProject(project: ProjectRecord): Promise<void>;
}
