import { NextRequest, NextResponse } from "next/server";
import { createCriterion, criterionSchema } from "@/server/admin";
import { jsonError } from "@/server/http";

export async function POST(request: NextRequest) {
  try {
    const input = criterionSchema.parse(await request.json());
    return NextResponse.json(await createCriterion(input), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
