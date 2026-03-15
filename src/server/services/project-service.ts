import type { ProjectRepository } from "@/server/domain/project-repository";
import type {
  AgentCreateInput,
  AgentUpdateInput,
  FeatureCreateInput,
  PlannerDraft,
  PhaseCreateInput,
  ProjectIntakeInput,
  ProjectMvpUpdateInput,
  ProjectRecord,
  ProjectRuntimeState,
  TaskCreateInput,
  TaskOwnerInput,
  TaskTransitionInput,
} from "@/server/domain/project";
import { sqliteProjectRepository } from "@/server/infrastructure/repositories/sqlite-project-repository";
import {
  ensureOrchestrationRunner,
  runProjectOrchestrationCycle,
} from "@/server/services/orchestration-service";
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
    definitionOfDone: [
      "The MVP boundary is explicit.",
      "The first tasks are small enough to assign and review.",
      "The workspace remains inspectable and recoverable.",
    ],
  };
}

export async function listProjects() {
  ensureOrchestrationRunner();
  return sqliteProjectRepository.listProjects();
}

export async function getProject(projectId: string) {
  ensureOrchestrationRunner();
  return sqliteProjectRepository.getProject(projectId);
}

export async function getProjectDashboard(projectId: string) {
  ensureOrchestrationRunner();
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
  ensureOrchestrationRunner(repository);
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

  try {
    const draft = await planner(input);
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
}

export async function updateProjectMvp(projectId: string, input: ProjectMvpUpdateInput) {
  const project = await sqliteProjectRepository.updateMvpDefinition(projectId, input);

  if (project) {
    await sqliteProjectRepository.recordEvent({
      projectId,
      type: "task",
      summary: "MVP draft updated",
      reason: "The project goal, MVP boundary, or definition of done were edited manually.",
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

  if (project?.runtime.orchestrationEnabled) {
    await runProjectOrchestrationCycle(projectId);
  }

  return project;
}

export async function transitionProjectTask(
  projectId: string,
  taskId: string,
  input: TaskTransitionInput,
) {
  const project = await sqliteProjectRepository.transitionTask(projectId, taskId, input);

  if (project) {
    await sqliteProjectRepository.recordEvent({
      projectId,
      type: "task",
      summary: "Task transitioned",
      reason: `Task ${taskId} moved to ${input.state}.`,
      payload: {
        taskId,
        state: input.state,
        agentId: input.agentId,
      },
    });

    if (project.runtime.orchestrationEnabled) {
      await runProjectOrchestrationCycle(projectId);
    }
  }

  return project;
}

export async function assignProjectTaskOwner(
  projectId: string,
  taskId: string,
  input: TaskOwnerInput,
) {
  const project = await sqliteProjectRepository.assignTaskOwner(projectId, taskId, input);

  if (project) {
    await sqliteProjectRepository.recordEvent({
      projectId,
      type: "task",
      summary: "Task owner updated",
      reason: `Task ${taskId} owner changed.`,
      payload: {
        taskId,
        ownerAgentId: input.ownerAgentId,
        agentId: input.agentId,
      },
    });

    if (project.runtime.orchestrationEnabled) {
      await runProjectOrchestrationCycle(projectId);
    }
  }

  return project;
}

export async function createProjectAgent(projectId: string, input: AgentCreateInput) {
  const project = await sqliteProjectRepository.createAgent(projectId, input);

  if (project) {
    await sqliteProjectRepository.recordEvent({
      projectId,
      type: "agent",
      summary: "Agent created",
      reason: `Created agent ${input.name}.`,
      payload: {
        policyRole: input.policyRole,
      },
    });
  }

  return project;
}

export async function updateProjectAgent(
  projectId: string,
  agentId: string,
  input: AgentUpdateInput,
) {
  const project = await sqliteProjectRepository.updateAgent(projectId, agentId, input);

  if (project) {
    await sqliteProjectRepository.recordEvent({
      projectId,
      type: "agent",
      summary: "Agent updated",
      reason: `Updated agent ${input.name}.`,
      payload: {
        agentId,
        policyRole: input.policyRole,
        enabled: input.enabled,
      },
    });
  }

  return project;
}

export async function updateProjectRuntime(projectId: string, runtime: ProjectRuntimeState) {
  const project = await sqliteProjectRepository.updateProjectRuntime(projectId, runtime);

  if (project) {
    await sqliteProjectRepository.recordEvent({
      projectId,
      type: "agent",
      summary: "Runtime updated",
      reason: runtime.orchestrationEnabled
        ? "Policy orchestration was enabled for the project."
        : "Policy orchestration was disabled for the project.",
      payload: {
        runnerStatus: runtime.runnerStatus,
      },
    });

    if (runtime.orchestrationEnabled) {
      await runProjectOrchestrationCycle(projectId);
    }
  }

  return project;
}

export async function seedProject(project: ProjectRecord) {
  return sqliteProjectRepository.seedDemoProject(project);
}
