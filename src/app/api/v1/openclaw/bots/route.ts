import { NextResponse } from "next/server";

import { getOpenClawCatalog } from "@/server/services/openclaw-service";

export async function GET() {
  return NextResponse.json(await getOpenClawCatalog());
}
