import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/server/http";
import { getTeacherSessionForm } from "@/server/teacher";
import { sessionFormQuerySchema } from "@/server/validation";

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const input = sessionFormQuerySchema.parse(params);
    const payload = await getTeacherSessionForm(input);
    return NextResponse.json(payload);
  } catch (error) {
    return jsonError(error);
  }
}
