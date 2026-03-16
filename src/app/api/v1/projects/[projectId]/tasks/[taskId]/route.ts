import { NextResponse } from "next/server";

import { jsonError } from "@/app/api/v1/_lib";
import { getProject } from "@/server/services/project-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; taskId: string }> },
) {
  const { projectId, taskId } = await context.params;
  const project = await getProject(projectId);

  if (!project) {
    return jsonError("Project not found.", 404);
  }

  const task = project.tasks.find((candidate) => candidate.id === taskId);

  if (!task) {
    return jsonError("Task not found.", 404);
  }

  return NextResponse.json(task);
}
