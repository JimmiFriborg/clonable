import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { parseJsonBody, jsonError } from "@/app/api/v1/_lib";
import { runtimeOrchestrationRequestSchema } from "@/server/api/contracts";
import { getProject, updateProjectRuntime } from "@/server/services/project-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    const project = await getProject(projectId);

    if (!project) {
      return jsonError("Project not found.", 404);
    }

    const input = await parseJsonBody(request, runtimeOrchestrationRequestSchema);
    const updatedProject = await updateProjectRuntime(projectId, {
      ...project.runtime,
      orchestrationEnabled: input.orchestrationEnabled,
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.message, 422);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to update runtime.", 500);
  }
}
