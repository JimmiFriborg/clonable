import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { parseJsonBody, jsonError } from "@/app/api/v1/_lib";
import { agentRunEnqueueRequestSchema } from "@/server/api/contracts";
import { enqueueProjectAgentRun } from "@/server/services/project-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    const input = await parseJsonBody(request, agentRunEnqueueRequestSchema);
    const run = await enqueueProjectAgentRun(projectId, input);
    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.message, 422);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to queue agent run.", 500);
  }
}
