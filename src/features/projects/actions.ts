"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  assignProjectTaskOwner,
  createProjectAgent,
  createProjectFeature,
  createProjectFromIdea,
  createProjectPhase,
  createProjectTask,
  getProject,
  updateProjectAgent,
  updateProjectMvp,
  updateProjectRuntime,
  transitionProjectTask,
} from "@/server/services/project-service";
import {
  refreshProjectPreview,
  restartProjectPreview,
  startProjectPreview,
  stopProjectPreview,
  updateProjectPreviewSettings,
} from "@/server/services/preview-service";
import {
  commitProjectWorkspace,
  configureProjectWorkspaceRemote,
  syncProjectWorkspace,
} from "@/server/services/workspace-service";
import {
  agentPolicyRoleOrder,
  agentStatusOrder,
  taskPriorityOrder,
  taskStateOrder,
} from "@/server/domain/project";
import { agentRuntimeBackendOrder, aiProviderOrder } from "@/server/domain/ai-provider";
import {
  createProjectChatSession,
  createTaskFromChatSuggestion,
  sendProjectChatMessage,
  updateProjectDefaultChatBot,
} from "@/server/services/openclaw-service";
import { localExecutionEnabled } from "@/server/services/deployment-service";

function parseLines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseBoolean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase() === "true";
}

function parseFallbackProviders(value: FormDataEntryValue | null) {
  return parseLines(value)
    .map((line) => {
      const [provider, ...modelParts] = line.split(":");
      const normalizedProvider = provider?.trim().toLowerCase();
      const model = modelParts.join(":").trim();

      if (!normalizedProvider || !model) {
        return undefined;
      }

      if (!aiProviderOrder.includes(normalizedProvider as (typeof aiProviderOrder)[number])) {
        return undefined;
      }

      return {
        provider: normalizedProvider as (typeof aiProviderOrder)[number],
        model,
      };
    })
    .filter((provider): provider is { provider: (typeof aiProviderOrder)[number]; model: string } =>
      Boolean(provider),
    );
}

function revalidateProjectPaths(projectId: string) {
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/build`);
  revalidatePath(`/projects/${projectId}/dashboard`);
  revalidatePath(`/projects/${projectId}/goal`);
  revalidatePath(`/projects/${projectId}/phases`);
  revalidatePath(`/projects/${projectId}/features`);
  revalidatePath(`/projects/${projectId}/tasks`);
  revalidatePath(`/projects/${projectId}/kanban`);
  revalidatePath(`/projects/${projectId}/agents`);
  revalidatePath(`/projects/${projectId}/workspace`);
  revalidatePath(`/projects/${projectId}/preview`);
  revalidatePath(`/projects/${projectId}/logs`);
  revalidatePath(`/projects/${projectId}/settings`);
}

function guardLocalExecution(returnPath: string) {
  if (!localExecutionEnabled()) {
    redirect(returnPath);
  }
}

export async function createProjectAction(formData: FormData) {
  const project = await createProjectFromIdea({
    name: String(formData.get("name") ?? "").trim(),
    ideaPrompt: String(formData.get("ideaPrompt") ?? "").trim(),
    targetUser: String(formData.get("targetUser") ?? "").trim(),
    constraints: parseLines(formData.get("constraints")),
    stackPreferences: parseLines(formData.get("stackPreferences")),
    githubRepositoryUrl: String(formData.get("githubRepositoryUrl") ?? "").trim() || undefined,
  });

  revalidatePath("/");
  redirect(`/projects/${project.id}/build`);
}

export async function updateProjectGoalAction(projectId: string, formData: FormData) {
  await updateProjectMvp(projectId, {
    vision: String(formData.get("vision") ?? "").trim(),
    goalStatement: String(formData.get("goalStatement") ?? "").trim(),
    summary: String(formData.get("summary") ?? "").trim(),
    successDefinition: String(formData.get("successDefinition") ?? "").trim(),
    boundaryReasoning: String(formData.get("boundaryReasoning") ?? "").trim(),
    laterScope: parseLines(formData.get("laterScope")),
    constraints: parseLines(formData.get("constraints")),
    definitionOfDone: parseLines(formData.get("definitionOfDone")),
  });

  revalidateProjectPaths(projectId);
  redirect(`/projects/${projectId}/goal`);
}

export async function createProjectPhaseAction(
  projectId: string,
  returnPath: string,
  formData: FormData,
) {
  await createProjectPhase(projectId, {
    title: String(formData.get("title") ?? "").trim(),
    goal: String(formData.get("goal") ?? "").trim(),
  });

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function createProjectFeatureAction(
  projectId: string,
  returnPath: string,
  formData: FormData,
) {
  const priority = String(formData.get("priority") ?? "normal").trim();

  await createProjectFeature(projectId, {
    phaseId: String(formData.get("phaseId") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    summary: String(formData.get("summary") ?? "").trim(),
    priority: taskPriorityOrder.includes(priority as (typeof taskPriorityOrder)[number])
      ? (priority as (typeof taskPriorityOrder)[number])
      : "normal",
  });

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function createProjectTaskAction(
  projectId: string,
  returnPath: string,
  formData: FormData,
) {
  const priority = String(formData.get("priority") ?? "normal").trim();
  const dependencies = formData
    .getAll("dependencies")
    .map((value) => String(value).trim())
    .filter(Boolean);

  await createProjectTask(projectId, {
    featureId: String(formData.get("featureId") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    priority: taskPriorityOrder.includes(priority as (typeof taskPriorityOrder)[number])
      ? (priority as (typeof taskPriorityOrder)[number])
      : "normal",
    acceptanceCriteria: parseLines(formData.get("acceptanceCriteria")),
    dependencies,
    requiresUser: parseBoolean(formData.get("requiresUser")),
  });

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function transitionTaskAction(
  projectId: string,
  taskId: string,
  returnPath: string,
  formData: FormData,
) {
  const state = String(formData.get("state") ?? "Backlog").trim();

  await transitionProjectTask(projectId, taskId, {
    state: taskStateOrder.includes(state as (typeof taskStateOrder)[number])
      ? (state as (typeof taskStateOrder)[number])
      : "Backlog",
    agentId: String(formData.get("agentId") ?? "").trim(),
    note: String(formData.get("note") ?? "").trim() || undefined,
    blockerReason: String(formData.get("blockerReason") ?? "").trim() || undefined,
    waitingReason: String(formData.get("waitingReason") ?? "").trim() || undefined,
    reviewDate: String(formData.get("reviewDate") ?? "").trim() || undefined,
  });

  revalidateProjectPaths(projectId);
  revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
  redirect(returnPath);
}

export async function assignTaskOwnerAction(
  projectId: string,
  taskId: string,
  returnPath: string,
  formData: FormData,
) {
  await assignProjectTaskOwner(projectId, taskId, {
    ownerAgentId: String(formData.get("ownerAgentId") ?? "").trim() || undefined,
    agentId: String(formData.get("agentId") ?? "").trim(),
  });

  revalidateProjectPaths(projectId);
  revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
  redirect(returnPath);
}

export async function createProjectAgentAction(
  projectId: string,
  returnPath: string,
  formData: FormData,
) {
  const policyRole = String(formData.get("policyRole") ?? "builder").trim();
  const status = String(formData.get("status") ?? "ready").trim();
  const runtimeBackend = String(formData.get("runtimeBackend") ?? "provider").trim();
  const provider = String(formData.get("provider") ?? "openai").trim();
  const wipLimitValue = String(formData.get("wipLimit") ?? "").trim();

  await createProjectAgent(projectId, {
    name: String(formData.get("name") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    policyRole: agentPolicyRoleOrder.includes(policyRole as (typeof agentPolicyRoleOrder)[number])
      ? (policyRole as (typeof agentPolicyRoleOrder)[number])
      : "builder",
    runtimeBackend: agentRuntimeBackendOrder.includes(
      runtimeBackend as (typeof agentRuntimeBackendOrder)[number],
    )
      ? (runtimeBackend as (typeof agentRuntimeBackendOrder)[number])
      : "provider",
    provider: aiProviderOrder.includes(provider as (typeof aiProviderOrder)[number])
      ? (provider as (typeof aiProviderOrder)[number])
      : "openai",
    model: String(formData.get("model") ?? "").trim(),
    fallbackProviders: parseFallbackProviders(formData.get("fallbackProviders")),
    openclawBotId: String(formData.get("openclawBotId") ?? "").trim() || undefined,
    status: agentStatusOrder.includes(status as (typeof agentStatusOrder)[number])
      ? (status as (typeof agentStatusOrder)[number])
      : "ready",
    enabled: parseBoolean(formData.get("enabled")),
    instructionsSummary: String(formData.get("instructionsSummary") ?? "").trim(),
    instructions: String(formData.get("instructions") ?? "").trim(),
    permissions: parseLines(formData.get("permissions")),
    boundaries: parseLines(formData.get("boundaries")),
    escalationRules: parseLines(formData.get("escalationRules")),
    wipLimit: wipLimitValue ? Number(wipLimitValue) : undefined,
    canWriteWorkspace: parseBoolean(formData.get("canWriteWorkspace")),
  });

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function updateProjectAgentAction(
  projectId: string,
  agentId: string,
  returnPath: string,
  formData: FormData,
) {
  const policyRole = String(formData.get("policyRole") ?? "builder").trim();
  const status = String(formData.get("status") ?? "ready").trim();
  const runtimeBackend = String(formData.get("runtimeBackend") ?? "provider").trim();
  const provider = String(formData.get("provider") ?? "openai").trim();
  const wipLimitValue = String(formData.get("wipLimit") ?? "").trim();

  await updateProjectAgent(projectId, agentId, {
    name: String(formData.get("name") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    policyRole: agentPolicyRoleOrder.includes(policyRole as (typeof agentPolicyRoleOrder)[number])
      ? (policyRole as (typeof agentPolicyRoleOrder)[number])
      : "builder",
    runtimeBackend: agentRuntimeBackendOrder.includes(
      runtimeBackend as (typeof agentRuntimeBackendOrder)[number],
    )
      ? (runtimeBackend as (typeof agentRuntimeBackendOrder)[number])
      : "provider",
    provider: aiProviderOrder.includes(provider as (typeof aiProviderOrder)[number])
      ? (provider as (typeof aiProviderOrder)[number])
      : "openai",
    model: String(formData.get("model") ?? "").trim(),
    fallbackProviders: parseFallbackProviders(formData.get("fallbackProviders")),
    openclawBotId: String(formData.get("openclawBotId") ?? "").trim() || undefined,
    status: agentStatusOrder.includes(status as (typeof agentStatusOrder)[number])
      ? (status as (typeof agentStatusOrder)[number])
      : "ready",
    enabled: parseBoolean(formData.get("enabled")),
    instructionsSummary: String(formData.get("instructionsSummary") ?? "").trim(),
    instructions: String(formData.get("instructions") ?? "").trim(),
    permissions: parseLines(formData.get("permissions")),
    boundaries: parseLines(formData.get("boundaries")),
    escalationRules: parseLines(formData.get("escalationRules")),
    wipLimit: wipLimitValue ? Number(wipLimitValue) : undefined,
    canWriteWorkspace: parseBoolean(formData.get("canWriteWorkspace")),
  });

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function toggleProjectOrchestrationAction(
  projectId: string,
  returnPath: string,
  formData: FormData,
) {
  const project = await getProject(projectId);

  if (project) {
    await updateProjectRuntime(projectId, {
      ...project.runtime,
      orchestrationEnabled: parseBoolean(formData.get("orchestrationEnabled")),
    });
  }

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function syncWorkspaceAction(projectId: string, returnPath: string) {
  guardLocalExecution(returnPath);
  await syncProjectWorkspace(projectId);

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function commitWorkspaceAction(
  projectId: string,
  returnPath: string,
  formData: FormData,
) {
  guardLocalExecution(returnPath);
  await commitProjectWorkspace(projectId, String(formData.get("message") ?? "").trim());

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function configureWorkspaceRemoteAction(
  projectId: string,
  returnPath: string,
  formData: FormData,
) {
  await configureProjectWorkspaceRemote(
    projectId,
    String(formData.get("remoteUrl") ?? "").trim(),
  );

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function updatePreviewSettingsAction(
  projectId: string,
  returnPath: string,
  formData: FormData,
) {
  guardLocalExecution(returnPath);
  await updateProjectPreviewSettings(projectId, {
    command: String(formData.get("command") ?? "").trim(),
    port: Number(String(formData.get("port") ?? "3000").trim()),
  });

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function startPreviewAction(projectId: string, returnPath: string) {
  guardLocalExecution(returnPath);
  await startProjectPreview(projectId);

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function restartPreviewAction(projectId: string, returnPath: string) {
  guardLocalExecution(returnPath);
  await restartProjectPreview(projectId);

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function stopPreviewAction(projectId: string, returnPath: string) {
  guardLocalExecution(returnPath);
  await stopProjectPreview(projectId);

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function refreshPreviewAction(projectId: string, returnPath: string) {
  guardLocalExecution(returnPath);
  await refreshProjectPreview(projectId);

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function setProjectDefaultChatBotAction(
  projectId: string,
  returnPath: string,
  formData: FormData,
) {
  const botId = String(formData.get("botId") ?? "").trim();

  await updateProjectDefaultChatBot(projectId, botId);
  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function createProjectChatSessionAction(
  projectId: string,
  returnPath: string,
  formData: FormData,
) {
  const botId = String(formData.get("botId") ?? "").trim();
  const session = await createProjectChatSession(projectId, {
    botId,
    title: String(formData.get("title") ?? "").trim() || undefined,
  });

  revalidateProjectPaths(projectId);
  const destination = session ? `${returnPath}?session=${session.id}` : returnPath;
  redirect(destination);
}

export async function sendProjectChatMessageAction(
  projectId: string,
  returnPath: string,
  formData: FormData,
) {
  const result = await sendProjectChatMessage(projectId, {
    sessionId: String(formData.get("sessionId") ?? "").trim() || undefined,
    botId: String(formData.get("botId") ?? "").trim(),
    content: String(formData.get("content") ?? "").trim(),
  });

  revalidateProjectPaths(projectId);
  const destination =
    result?.sessionId ? `${returnPath}?session=${result.sessionId}` : returnPath;
  redirect(destination);
}

export async function createTaskFromChatSuggestionAction(
  projectId: string,
  returnPath: string,
  formData: FormData,
) {
  const sessionId = String(formData.get("sessionId") ?? "").trim();

  await createTaskFromChatSuggestion(projectId, {
    sessionId,
    messageId: String(formData.get("messageId") ?? "").trim(),
    suggestionId: String(formData.get("suggestionId") ?? "").trim(),
    featureId: String(formData.get("featureId") ?? "").trim(),
  });

  revalidateProjectPaths(projectId);
  const destination = sessionId ? `${returnPath}?session=${sessionId}` : returnPath;
  redirect(destination);
}
