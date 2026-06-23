import { NextRequest, NextResponse } from "next/server";
import { teacherUpdateSchema, updateTeacher } from "@/server/admin";
import { jsonError } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const input = teacherUpdateSchema.parse(await request.json());
    return NextResponse.json(await updateTeacher(id, input));
  } catch (error) {
    return jsonError(error);
  }
}
