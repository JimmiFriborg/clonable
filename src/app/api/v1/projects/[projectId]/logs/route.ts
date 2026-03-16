import { NextResponse } from "next/server";

import { jsonError } from "@/app/api/v1/_lib";
import { getProject } from "@/server/services/project-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const project = await getProject(projectId);

  if (!project) {
    return jsonError("Project not found.", 404);
  }

  return NextResponse.json({
    events: project.events,
    agentRuns: project.agentRuns,
    tasks: project.tasks,
  });
}
