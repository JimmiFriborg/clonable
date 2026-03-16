import { NextResponse } from "next/server";

import { appwriteEnabled } from "@/server/infrastructure/appwrite/config";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "clonable",
    environment: process.env.NODE_ENV,
    siteUrl: process.env.CLONABLE_SITE_URL?.trim() || null,
    appwriteConfigured: appwriteEnabled(),
    checkedAt: new Date().toISOString(),
  });
}
