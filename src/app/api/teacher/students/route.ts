import { NextRequest, NextResponse } from "next/server";
import { createTeacherStudent, teacherStudentSchema } from "@/server/teacher";
import { jsonError } from "@/server/http";

export async function POST(request: NextRequest) {
  try {
    const input = teacherStudentSchema.parse(await request.json());
    return NextResponse.json(await createTeacherStudent(input), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
