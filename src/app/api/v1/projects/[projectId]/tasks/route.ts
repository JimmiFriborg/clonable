import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { parseJsonBody, jsonError } from "@/app/api/v1/_lib";
import { createTaskRequestSchema } from "@/server/api/contracts";
import { createProjectTask } from "@/server/services/project-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    const input = await parseJsonBody(request, createTaskRequestSchema);
    const project = await createProjectTask(projectId, input);

    if (!project) {
      return jsonError("Project not found.", 404);
    }

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.message, 422);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to create task.", 500);
  }
}
