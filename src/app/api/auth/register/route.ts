import { NextRequest, NextResponse } from "next/server";
import { registerMosque, registerSchema } from "@/server/auth-service";
import { jsonError } from "@/server/http";

export async function POST(request: NextRequest) {
  try {
    const input = registerSchema.parse(await request.json());
    const result = await registerMosque(input);
    const response = NextResponse.json({ user: result.user }, { status: 201 });
    response.cookies.set(result.cookie);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
