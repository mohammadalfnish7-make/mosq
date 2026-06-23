import { NextRequest, NextResponse } from "next/server";
import { getRequestMeta } from "@/lib/request-meta";
import { loginSchema, loginUser } from "@/server/auth-service";
import { jsonError } from "@/server/http";

export async function POST(request: NextRequest) {
  try {
    const input = loginSchema.parse(await request.json());
    const result = await loginUser(input, getRequestMeta(request));
    const response = NextResponse.json({ user: result.user });
    response.cookies.set(result.cookie);
    return response;
  } catch (error) {
    return jsonError(error, { path: "/api/auth/login" });
  }
}
