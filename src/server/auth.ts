import { headers } from "next/headers";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/server/http";

export type AuthContext = {
  userId: string;
  tenantId: string;
  role: UserRole;
  fullName: string;
};

export async function getAuthContext(requiredRole?: UserRole): Promise<AuthContext> {
  const requestHeaders = await headers();
  const requestedUserId = requestHeaders.get("x-user-id");

  const user = requestedUserId
    ? await prisma.user.findFirst({
        where: { id: requestedUserId, isActive: true }
      })
    : await prisma.user.findFirst({
        where: {
          isActive: true,
          role: requiredRole ?? undefined
        },
        orderBy: { createdAt: "asc" }
      });

  if (!user) {
    throw new HttpError(401, "No active user context found");
  }

  if (requiredRole && user.role !== requiredRole) {
    throw new HttpError(403, "Insufficient permissions");
  }

  return {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    fullName: user.fullName
  };
}

export async function assertTeacherCircleAccess(tenantId: string, teacherId: string, circleId: string) {
  const assignment = await prisma.circleTeacher.findUnique({
    where: {
      tenantId_circleId_teacherId: {
        tenantId,
        circleId,
        teacherId
      }
    }
  });

  if (!assignment) {
    throw new HttpError(403, "Teacher is not assigned to this circle");
  }
}
