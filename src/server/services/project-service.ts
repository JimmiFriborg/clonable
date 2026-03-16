import crypto from "node:crypto";

import type { ProjectRepository } from "@/server/domain/project-repository";
import type {
  AgentCreateInput,
  AgentRunCreateInput,
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
import type { ProviderConfigResponse } from "@/server/domain/ai-provider";
import type { AgentRuntimeBackend, AiProvider } from "@/server/domain/ai-provider";
import { getProviderConfigResponse } from "@/server/services/provider-gateway";
import { sqliteProjectRepository } from "@/server/infrastructure/repositories/sqlite-project-repository";
import { syncProjectMetadataToAppwrite } from "@/server/infrastructure/appwrite/metadata-sync";
import { resolveOpenClawDefaultBotId } from "@/server/domain/openclaw";
import {
  ensureOrchestrationRunner,
  runProjectOrchestrationCycle,
} from "@/server/services/orchestration-service";
import { generatePlannerDraft } from "@/server/services/planner-service";
import { ensureTaskWorkspaceBranch } from "@/server/services/workspace-service";

const DEFAULT_PLANNER_TIMEOUT_MS = 10_000;

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

function getPlannerTimeoutMs() {
  const raw = Number(process.env.CLONABLE_PLANNER_TIMEOUT_MS ?? DEFAULT_PLANNER_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_PLANNER_TIMEOUT_MS;
}

async function runPlannerWithTimeout(
  planner: (input: ProjectIntakeInput) => Promise<PlannerDraft>,
  input: ProjectIntakeInput,
) {
  const timeoutMs = getPlannerTimeoutMs();
  let timer: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      planner(input),
      new Promise<PlannerDraft>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Planner timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function syncProjectMetadata(project: ProjectRecord | undefined) {
  if (!project) {
    return;
  }

  try {
    await syncProjectMetadataToAppwrite(project);
  } catch (error) {
    console.error("Appwrite metadata sync failed", error);
  }
}

function normalizeAgentInput(input: AgentCreateInput): AgentCreateInput {
  const runtimeBackend = (input.runtimeBackend ?? "provider") as AgentRuntimeBackend;

  if (runtimeBackend === "openclaw") {
    const botId = resolveOpenClawDefaultBotId(
      input.openclawBotId ?? process.env.OPENCLAW_DEFAULT_BOT_ID,
    );

    return {
      ...input,
      runtimeBackend,
      provider: undefined,
      model: input.model.trim() || "OpenClaw",
      fallbackProviders: [],
      openclawBotId: botId,
    };
  }

  const provider = (input.provider ?? "openai") as AiProvider;

  return {
    ...input,
    runtimeBackend: "provider",
    provider,
    model: input.model.trim() || "GPT-5.4",
    fallbackProviders: input.fallbackProviders ?? [],
    openclawBotId: undefined,
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
    const draft = await runPlannerWithTimeout(planner, input);
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

    await syncProjectMetadata(updatedProject);
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

    await syncProjectMetadata(updatedProject);
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

  await syncProjectMetadata(project);
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

  await syncProjectMetadata(project);
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

  await syncProjectMetadata(project);
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

  await syncProjectMetadata(project);
  return project;
}

export async function transitionProjectTask(
  projectId: string,
  taskId: string,
  input: TaskTransitionInput,
) {
  let project = await sqliteProjectRepository.transitionTask(projectId, taskId, input);

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

    if (input.state === "In_Progress") {
      project = (await ensureTaskWorkspaceBranch(projectId, taskId)) ?? project;
    }
  }

  await syncProjectMetadata(project);
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

  await syncProjectMetadata(project);
  return project;
}

export async function createProjectAgent(projectId: string, input: AgentCreateInput) {
  const project = await sqliteProjectRepository.createAgent(projectId, normalizeAgentInput(input));

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

  await syncProjectMetadata(project);
  return project;
}

export async function updateProjectAgent(
  projectId: string,
  agentId: string,
  input: AgentUpdateInput,
) {
  const project = await sqliteProjectRepository.updateAgent(
    projectId,
    agentId,
    normalizeAgentInput(input),
  );

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

  await syncProjectMetadata(project);
  return project;
}

export async function updateProjectAgentRuntime(
  projectId: string,
  agentId: string,
  runtime: Pick<
    AgentCreateInput,
    "runtimeBackend" | "provider" | "model" | "fallbackProviders" | "openclawBotId"
  >,
) {
  const project = await sqliteProjectRepository.getProject(projectId);
  const agent = project?.agents.find((candidate) => candidate.id === agentId);

  if (!project || !agent) {
    return undefined;
  }

  return updateProjectAgent(projectId, agentId, {
    ...agent,
    ...runtime,
  });
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

  await syncProjectMetadata(project);
  return project;
}

export async function enqueueProjectAgentRun(projectId: string, input: AgentRunCreateInput) {
  const run = {
    id: `run-${crypto.randomUUID()}`,
    agentId: input.agentId,
    taskId: input.taskId,
    status: "Queued" as const,
    trigger: input.trigger,
    summary: input.summary,
    reason: input.reason,
    inputSummary: input.inputSummary,
    changedFiles: [],
    artifacts: [],
    createdAt: new Date().toISOString(),
  };

  const project = await sqliteProjectRepository.addAgentRun(projectId, run);

  if (project) {
    await sqliteProjectRepository.recordEvent({
      projectId,
      type: "agent",
      summary: "Agent run queued",
      reason: input.reason,
      payload: {
        taskId: input.taskId,
        agentId: input.agentId,
        trigger: input.trigger,
      },
    });
  }

  await syncProjectMetadata(project);
  return run;
}

export async function getProjectProviderConfig(): Promise<ProviderConfigResponse> {
  return getProviderConfigResponse();
}

export async function seedProject(project: ProjectRecord) {
  return sqliteProjectRepository.seedDemoProject(project);
}
