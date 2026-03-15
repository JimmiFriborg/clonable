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
  syncProjectWorkspace,
} from "@/server/services/workspace-service";
import {
  agentPolicyRoleOrder,
  agentStatusOrder,
  taskPriorityOrder,
  taskStateOrder,
} from "@/server/domain/project";

function parseLines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseBoolean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase() === "true";
}

function revalidateProjectPaths(projectId: string) {
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
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

export async function createProjectAction(formData: FormData) {
  const project = await createProjectFromIdea({
    name: String(formData.get("name") ?? "").trim(),
    ideaPrompt: String(formData.get("ideaPrompt") ?? "").trim(),
    targetUser: String(formData.get("targetUser") ?? "").trim(),
    constraints: parseLines(formData.get("constraints")),
    stackPreferences: parseLines(formData.get("stackPreferences")),
  });

  revalidatePath("/");
  redirect(`/projects/${project.id}/goal`);
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
  const wipLimitValue = String(formData.get("wipLimit") ?? "").trim();

  await createProjectAgent(projectId, {
    name: String(formData.get("name") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    policyRole: agentPolicyRoleOrder.includes(policyRole as (typeof agentPolicyRoleOrder)[number])
      ? (policyRole as (typeof agentPolicyRoleOrder)[number])
      : "builder",
    model: String(formData.get("model") ?? "").trim(),
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
  const wipLimitValue = String(formData.get("wipLimit") ?? "").trim();

  await updateProjectAgent(projectId, agentId, {
    name: String(formData.get("name") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    policyRole: agentPolicyRoleOrder.includes(policyRole as (typeof agentPolicyRoleOrder)[number])
      ? (policyRole as (typeof agentPolicyRoleOrder)[number])
      : "builder",
    model: String(formData.get("model") ?? "").trim(),
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
  await syncProjectWorkspace(projectId);

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function commitWorkspaceAction(
  projectId: string,
  returnPath: string,
  formData: FormData,
) {
  await commitProjectWorkspace(projectId, String(formData.get("message") ?? "").trim());

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function updatePreviewSettingsAction(
  projectId: string,
  returnPath: string,
  formData: FormData,
) {
  await updateProjectPreviewSettings(projectId, {
    command: String(formData.get("command") ?? "").trim(),
    port: Number(String(formData.get("port") ?? "3000").trim()),
  });

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function startPreviewAction(projectId: string, returnPath: string) {
  await startProjectPreview(projectId);

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function restartPreviewAction(projectId: string, returnPath: string) {
  await restartProjectPreview(projectId);

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function stopPreviewAction(projectId: string, returnPath: string) {
  await stopProjectPreview(projectId);

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function refreshPreviewAction(projectId: string, returnPath: string) {
  await refreshProjectPreview(projectId);

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}
