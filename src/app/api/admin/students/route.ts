import { NextRequest, NextResponse } from "next/server";
import { createStudent, studentSchema } from "@/server/admin";
import { jsonError } from "@/server/http";

export async function POST(request: NextRequest) {
  try {
    const input = studentSchema.parse(await request.json());
    return NextResponse.json(await createStudent(input), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
