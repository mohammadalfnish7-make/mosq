import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { AuditAction, postAuditFromEdge } from "@/lib/audit";
import { getRequestMeta } from "@/lib/request-meta";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const PUBLIC_PATHS = ["/", "/login", "/register"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname);
}

function requiredRoleForPath(pathname: string): UserRole | null {
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    return UserRole.ADMIN;
  }
  if (pathname.startsWith("/teacher") || pathname.startsWith("/api/teacher")) {
    return UserRole.TEACHER;
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth") || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const requiredRole = requiredRoleForPath(pathname);
  if (!requiredRole) {
    return NextResponse.next();
  }

  const meta = getRequestMeta(request);
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    postAuditFromEdge(request.url, {
      action: AuditAction.ACCESS_UNAUTHENTICATED,
      metadata: { pathname, requiredRole },
      ...meta
    });

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session.role !== requiredRole) {
    postAuditFromEdge(request.url, {
      tenantId: session.tenantId,
      actorId: session.userId,
      action: AuditAction.ACCESS_DENIED,
      metadata: { pathname, requiredRole, actualRole: session.role },
      ...meta
    });

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "ليس لديك صلاحية للوصول" }, { status: 403 });
    }
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/api/admin/:path*", "/api/teacher/:path*"]
};
