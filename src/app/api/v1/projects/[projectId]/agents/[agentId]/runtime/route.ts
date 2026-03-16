import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { jsonError, parseJsonBody } from "@/app/api/v1/_lib";
import { agentRuntimeRequestSchema } from "@/server/api/contracts";
import { updateProjectAgentRuntime } from "@/server/services/project-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; agentId: string }> },
) {
  try {
    const { projectId, agentId } = await context.params;
    const input = await parseJsonBody(request, agentRuntimeRequestSchema);
    const project = await updateProjectAgentRuntime(projectId, agentId, input);

    if (!project) {
      return jsonError("Project or agent not found.", 404);
    }

    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.message, 422);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to update agent runtime.", 500);
  }
}
