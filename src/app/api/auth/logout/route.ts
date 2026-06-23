import { NextRequest, NextResponse } from "next/server";
import { getRequestMeta } from "@/lib/request-meta";
import { clearSessionCookieOptions } from "@/lib/session";
import { logoutUser } from "@/server/auth-service";

export async function POST(request: NextRequest) {
  await logoutUser(getRequestMeta(request));
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearSessionCookieOptions());
  return response;
}
