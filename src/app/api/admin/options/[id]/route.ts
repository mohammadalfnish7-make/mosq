import { NextRequest, NextResponse } from "next/server";
import { optionUpdateSchema, updateOption } from "@/server/admin";
import { jsonError } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const input = optionUpdateSchema.parse(await request.json());
    return NextResponse.json(await updateOption(id, input));
  } catch (error) {
    return jsonError(error);
  }
}
