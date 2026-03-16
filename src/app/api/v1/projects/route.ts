import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { parseJsonBody, jsonError } from "@/app/api/v1/_lib";
import { createProjectRequestSchema } from "@/server/api/contracts";
import { createProjectFromIdea, listProjects } from "@/server/services/project-service";

export async function GET() {
  const projects = await listProjects();
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, createProjectRequestSchema);
    const project = await createProjectFromIdea(input);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(error.message, 422);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to create project.", 500);
  }
}
