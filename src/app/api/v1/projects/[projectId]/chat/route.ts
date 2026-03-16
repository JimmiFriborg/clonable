import { NextResponse } from "next/server";

import { jsonError } from "@/app/api/v1/_lib";
import { getProjectChatSurface } from "@/server/services/openclaw-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const sessionId = new URL(request.url).searchParams.get("session") ?? undefined;
  const chat = await getProjectChatSurface(projectId, sessionId);

  if (!chat) {
    return jsonError("Project not found.", 404);
  }

  return NextResponse.json(chat);
}
