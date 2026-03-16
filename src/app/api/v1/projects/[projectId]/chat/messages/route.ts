import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { jsonError, parseJsonBody } from "@/app/api/v1/_lib";
import { projectChatMessageRequestSchema } from "@/server/api/contracts";
import { sendProjectChatMessage } from "@/server/services/openclaw-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    const input = await parseJsonBody(request, projectChatMessageRequestSchema);
    const result = await sendProjectChatMessage(projectId, input);

    if (!result) {
      return jsonError("Project not found.", 404);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.message, 422);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to send chat message.", 500);
  }
}
