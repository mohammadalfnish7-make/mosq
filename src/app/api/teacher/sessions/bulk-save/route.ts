import { NextRequest } from "next/server";
import { jsonData, jsonError } from "@/server/http";

export const dynamic = "force-dynamic";
import { bulkSaveTeacherSession } from "@/server/teacher";
import { bulkSaveSchema } from "@/server/validation";

export async function POST(request: NextRequest) {
  try {
    const input = bulkSaveSchema.parse(await request.json());
    const result = await bulkSaveTeacherSession(input);
    return jsonData(result);
  } catch (error) {
    return jsonError(error);
  }
}
