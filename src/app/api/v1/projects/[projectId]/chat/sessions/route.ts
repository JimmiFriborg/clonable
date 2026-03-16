import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { jsonError, parseJsonBody } from "@/app/api/v1/_lib";
import { projectChatSessionRequestSchema } from "@/server/api/contracts";
import { createProjectChatSession } from "@/server/services/openclaw-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    const input = await parseJsonBody(request, projectChatSessionRequestSchema);
    const session = await createProjectChatSession(projectId, input);

    if (!session) {
      return jsonError("Project not found.", 404);
    }

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.message, 422);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to create chat session.", 500);
  }
}
