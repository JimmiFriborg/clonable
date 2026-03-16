import { NextResponse } from "next/server";
import { z } from "zod";

export async function parseJsonBody<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
) {
  const payload = await request.json();
  return schema.parse(payload);
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      error: message,
    },
    { status },
  );
}
