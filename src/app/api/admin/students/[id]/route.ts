import { NextRequest, NextResponse } from "next/server";
import { studentUpdateSchema, updateStudent } from "@/server/admin";
import { jsonError } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const input = studentUpdateSchema.parse(await request.json());
    return NextResponse.json(await updateStudent(id, input));
  } catch (error) {
    return jsonError(error);
  }
}
