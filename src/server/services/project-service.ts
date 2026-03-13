import { sqliteProjectRepository } from "@/server/infrastructure/repositories/sqlite-project-repository";
import type { ProjectRepository } from "@/server/domain/project-repository";
import type {
  FeatureCreateInput,
  PlannerDraft,
  PhaseCreateInput,
  ProjectIntakeInput,
  ProjectMvpUpdateInput,
  ProjectRecord,
  TaskCreateInput,
  TaskStatusUpdateInput,
} from "@/server/domain/project";
import { generatePlannerDraft } from "@/server/services/planner-service";

function buildFallbackMvp(input: ProjectIntakeInput): ProjectMvpUpdateInput {
  return {
    vision: input.ideaPrompt,
    goalStatement: input.ideaPrompt,
    summary: `Define the smallest credible MVP for ${input.name}.`,
    successDefinition: "Confirm the MVP boundary and establish the first execution phase.",
    boundaryReasoning:
      "Planner output was unavailable, so this project starts with a manual draft based on the original idea prompt.",
    laterScope: [],
    constraints: input.constraints,
  };
}

export async function listProjects() {
  return sqliteProjectRepository.listProjects();
}

export async function getProject(projectId: string) {
  return sqliteProjectRepository.getProject(projectId);
}

export async function getProjectDashboard(projectId: string) {
  return sqliteProjectRepository.getProjectDashboard(projectId);
}

interface CreateProjectDependencies {
  repository?: ProjectRepository;
  planner?: (input: ProjectIntakeInput) => Promise<PlannerDraft>;
}

export async function createProjectFromIdea(
  input: ProjectIntakeInput,
  dependencies: CreateProjectDependencies = {},
) {
  const repository = dependencies.repository ?? sqliteProjectRepository;
  const planner = dependencies.planner ?? generatePlannerDraft;
  const project = await repository.createProject(input);

  await repository.recordEvent({
    projectId: project.id,
    type: "system",
    summary: "Project intake captured",
    reason: "The project was created from the intake form and queued for planning.",
    payload: {
      targetUser: input.targetUser,
      constraints: input.constraints,
      stackPreferences: input.stackPreferences,
    },
  });

  let draft: PlannerDraft;

  try {
    draft = await planner(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown planner failure.";
    const updatedProject = await repository.savePlannerFailure(
      project.id,
      message,
      buildFallbackMvp(input),
    );

    await repository.recordEvent({
      projectId: project.id,
      type: "system",
      summary: "Planner failed",
      reason: message,
      payload: {
        fallback: true,
      },
    });

    return updatedProject;
  }

  const updatedProject = await repository.savePlannerDraft(project.id, draft);

  await repository.recordEvent({
    projectId: project.id,
    type: "task",
    summary: "Planner draft generated",
    reason: "The AI planner generated the first MVP and execution structure.",
    payload: {
      phases: updatedProject.phases.length,
      features: updatedProject.features.length,
      tasks: updatedProject.tasks.length,
    },
  });

  return updatedProject;
}

export async function updateProjectMvp(projectId: string, input: ProjectMvpUpdateInput) {
  const project = await sqliteProjectRepository.updateMvpDefinition(projectId, input);

  if (project) {
    await sqliteProjectRepository.recordEvent({
      projectId,
      type: "task",
      summary: "MVP draft updated",
      reason: "The project goal and MVP boundary were edited manually.",
    });
  }

  return project;
}

export async function createProjectPhase(projectId: string, input: PhaseCreateInput) {
  const project = await sqliteProjectRepository.createPhase(projectId, input);

  if (project) {
    await sqliteProjectRepository.recordEvent({
      projectId,
      type: "task",
      summary: "Phase added",
      reason: `The planning structure gained a new phase: ${input.title}.`,
    });
  }

  return project;
}

export async function createProjectFeature(projectId: string, input: FeatureCreateInput) {
  const project = await sqliteProjectRepository.createFeature(projectId, input);

  if (project) {
    await sqliteProjectRepository.recordEvent({
      projectId,
      type: "task",
      summary: "Feature added",
      reason: `A manual planning edit added the feature ${input.title}.`,
      payload: {
        phaseId: input.phaseId,
        priority: input.priority,
      },
    });
  }

  return project;
}

export async function createProjectTask(projectId: string, input: TaskCreateInput) {
  const project = await sqliteProjectRepository.createTask(projectId, input);

  if (project) {
    await sqliteProjectRepository.recordEvent({
      projectId,
      type: "task",
      summary: "Task added",
      reason: `A new task was added manually: ${input.title}.`,
      payload: {
        featureId: input.featureId,
        priority: input.priority,
        dependencies: input.dependencies,
      },
    });
  }

  return project;
}

export async function updateProjectTaskStatus(
  projectId: string,
  taskId: string,
  input: TaskStatusUpdateInput,
) {
  const project = await sqliteProjectRepository.updateTaskStatus(projectId, taskId, input);

  if (project) {
    await sqliteProjectRepository.recordEvent({
      projectId,
      type: "task",
      summary: "Task status updated",
      reason: `Task ${taskId} moved to ${input.status}.`,
      payload: {
        taskId,
        status: input.status,
      },
    });
  }

  return project;
}

export async function seedProject(project: ProjectRecord) {
  return sqliteProjectRepository.seedDemoProject(project);
}
