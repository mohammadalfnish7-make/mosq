import { NextRequest } from "next/server";
import { jsonData, jsonError } from "@/server/http";

export const dynamic = "force-dynamic";
import { getTeacherSessionForm } from "@/server/teacher";
import { sessionFormQuerySchema } from "@/server/validation";

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const input = sessionFormQuerySchema.parse(params);
    const payload = await getTeacherSessionForm(input);
    return jsonData(payload);
  } catch (error) {
    return jsonError(error);
  }
}
