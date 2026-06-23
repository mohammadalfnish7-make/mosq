import { NextRequest } from "next/server";

export type RequestMeta = {
  ip?: string;
  userAgent?: string;
};

export function getRequestMeta(request: NextRequest): RequestMeta {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? undefined;

  return {
    ip,
    userAgent: request.headers.get("user-agent") ?? undefined
  };
}
