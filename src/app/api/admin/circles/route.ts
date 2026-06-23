import { NextRequest, NextResponse } from "next/server";
import { createCircle, listAdminBootstrap, circleSchema } from "@/server/admin";
import { jsonError } from "@/server/http";

export async function GET() {
  try {
    return NextResponse.json(await listAdminBootstrap());
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = circleSchema.parse(await request.json());
    return NextResponse.json(await createCircle(input), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
