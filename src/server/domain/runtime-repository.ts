import type {
  PreviewRecord,
  ProjectRecord,
  ProjectRuntimeState,
  WorkspaceRecord,
} from "@/server/domain/project";

export interface RuntimeRepository {
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
}
