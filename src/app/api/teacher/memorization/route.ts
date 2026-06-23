import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/server/http";
import {
  getStudentMemorizationMap,
  memorizationQuerySchema,
  memorizationUpdateSchema,
  updateStudentMemorization
} from "@/server/memorization";

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const input = memorizationQuerySchema.parse(params);
    return NextResponse.json(await getStudentMemorizationMap(input));
  } catch (error) {
    return jsonError(error, { path: "/api/teacher/memorization" });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const input = memorizationUpdateSchema.parse(await request.json());
    return NextResponse.json(await updateStudentMemorization(input));
  } catch (error) {
    return jsonError(error, { path: "/api/teacher/memorization" });
  }
}
