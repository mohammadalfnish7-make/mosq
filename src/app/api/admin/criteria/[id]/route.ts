import { NextRequest, NextResponse } from "next/server";
import { criterionUpdateSchema, updateCriterion } from "@/server/admin";
import { jsonError } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const input = criterionUpdateSchema.parse(await request.json());
    return NextResponse.json(await updateCriterion(id, input));
  } catch (error) {
    return jsonError(error);
  }
}
