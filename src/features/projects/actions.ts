"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createProjectFeature,
  createProjectFromIdea,
  createProjectPhase,
  createProjectTask,
  updateProjectMvp,
  updateProjectTaskStatus,
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
import { priorityOrder, taskStatusOrder } from "@/server/domain/project";

function parseLines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function revalidateProjectPaths(projectId: string) {
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/goal`);
  revalidatePath(`/projects/${projectId}/phases`);
  revalidatePath(`/projects/${projectId}/features`);
  revalidatePath(`/projects/${projectId}/tasks`);
  revalidatePath(`/projects/${projectId}/kanban`);
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
  const priority = String(formData.get("priority") ?? "P1").trim();

  await createProjectFeature(projectId, {
    phaseId: String(formData.get("phaseId") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    summary: String(formData.get("summary") ?? "").trim(),
    priority: priorityOrder.includes(priority as (typeof priorityOrder)[number])
      ? (priority as (typeof priorityOrder)[number])
      : "P1",
  });

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function createProjectTaskAction(
  projectId: string,
  returnPath: string,
  formData: FormData,
) {
  const priority = String(formData.get("priority") ?? "P1").trim();
  const dependencies = formData
    .getAll("dependencies")
    .map((value) => String(value).trim())
    .filter(Boolean);

  await createProjectTask(projectId, {
    featureId: String(formData.get("featureId") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    priority: priorityOrder.includes(priority as (typeof priorityOrder)[number])
      ? (priority as (typeof priorityOrder)[number])
      : "P1",
    acceptanceCriteria: parseLines(formData.get("acceptanceCriteria")),
    dependencies,
  });

  revalidateProjectPaths(projectId);
  redirect(returnPath);
}

export async function updateTaskStatusAction(
  projectId: string,
  taskId: string,
  returnPath: string,
  formData: FormData,
) {
  const status = String(formData.get("status") ?? "Planned").trim();

  await updateProjectTaskStatus(projectId, taskId, {
    status: taskStatusOrder.includes(status as (typeof taskStatusOrder)[number])
      ? (status as (typeof taskStatusOrder)[number])
      : "Planned",
  });

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
  await commitProjectWorkspace(
    projectId,
    String(formData.get("message") ?? "").trim(),
  );

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
