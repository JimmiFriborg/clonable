import { NextResponse } from "next/server";

import { getProjectProviderConfig } from "@/server/services/project-service";

export async function GET() {
  return NextResponse.json(await getProjectProviderConfig());
}
