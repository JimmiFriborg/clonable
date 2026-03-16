import { NextResponse } from "next/server";

import { jsonError } from "@/app/api/v1/_lib";
import { getProjectDashboard } from "@/server/services/project-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const dashboard = await getProjectDashboard(projectId);

  if (!dashboard) {
    return jsonError("Project not found.", 404);
  }

  return NextResponse.json(dashboard);
}
