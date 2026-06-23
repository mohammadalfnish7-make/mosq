import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { HttpError } from "@/server/http";

export type AuthContext = {
  userId: string;
  tenantId: string;
  role: UserRole;
  fullName: string;
};

export async function getAuthContext(requiredRole?: UserRole): Promise<AuthContext> {
  const session = await getSession();

  if (!session) {
    throw new HttpError(401, "يجب تسجيل الدخول أولاً");
  }

  const user = await prisma.user.findFirst({
    where: { id: session.userId, isActive: true }
  });

  if (!user) {
    throw new HttpError(401, "المستخدم غير موجود أو غير نشط");
  }

  if (requiredRole && user.role !== requiredRole) {
    throw new HttpError(403, "ليس لديك صلاحية للوصول");
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
