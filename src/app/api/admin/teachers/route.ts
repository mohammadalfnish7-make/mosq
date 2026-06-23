import { NextRequest, NextResponse } from "next/server";
import { createTeacher, teacherSchema } from "@/server/admin";
import { jsonError } from "@/server/http";

export async function POST(request: NextRequest) {
  try {
    const input = teacherSchema.parse(await request.json());
    return NextResponse.json(await createTeacher(input), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
