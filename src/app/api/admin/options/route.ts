import { NextRequest, NextResponse } from "next/server";
import { createOption, optionSchema } from "@/server/admin";
import { jsonError } from "@/server/http";

export async function POST(request: NextRequest) {
  try {
    const input = optionSchema.parse(await request.json());
    return NextResponse.json(await createOption(input), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
