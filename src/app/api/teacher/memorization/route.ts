import { NextRequest } from "next/server";
import {
  getStudentMemorizationMap,
  memorizationQuerySchema,
  memorizationUpdateSchema,
  updateStudentMemorization
} from "@/server/memorization";
import { jsonData, jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const input = memorizationQuerySchema.parse(params);
    return jsonData(await getStudentMemorizationMap(input));
  } catch (error) {
    return jsonError(error, { path: "/api/teacher/memorization" });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const input = memorizationUpdateSchema.parse(await request.json());
    return jsonData(await updateStudentMemorization(input));
  } catch (error) {
    return jsonError(error, { path: "/api/teacher/memorization" });
  }
}
