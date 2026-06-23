import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/server/http";
import { bulkSaveTeacherSession } from "@/server/teacher";
import { bulkSaveSchema } from "@/server/validation";

export async function POST(request: NextRequest) {
  try {
    const input = bulkSaveSchema.parse(await request.json());
    const result = await bulkSaveTeacherSession(input);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
