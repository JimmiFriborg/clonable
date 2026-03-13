"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createProjectFromIdea, updateProjectMvp } from "@/server/services/project-service";

function parseLines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
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

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/goal`);
  redirect(`/projects/${projectId}/goal`);
}
