import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { parseJsonBody, jsonError } from "@/app/api/v1/_lib";
import { taskOwnerRequestSchema } from "@/server/api/contracts";
import { assignProjectTaskOwner } from "@/server/services/project-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; taskId: string }> },
) {
  try {
    const { projectId, taskId } = await context.params;
    const input = await parseJsonBody(request, taskOwnerRequestSchema);
    const project = await assignProjectTaskOwner(projectId, taskId, input);

    if (!project) {
      return jsonError("Project or task not found.", 404);
    }

    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.message, 422);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to assign task owner.", 500);
  }
}
