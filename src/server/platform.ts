import { UserRole } from "@prisma/client";
import { z } from "zod";
import { AuditAction, writeAuditAsync } from "@/lib/audit";
import { isPlatformTenant, PLATFORM_TENANT_ID } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import type { RequestMeta } from "@/lib/request-meta";
import { getAuthContext } from "@/server/auth";
import { HttpError } from "@/server/http";
import { createTenantWithAdmin, registerSchema } from "@/server/auth-service";
import type { PlatformBootstrap } from "@/types/platform-bootstrap";

export const tenantStatusSchema = z.object({
  isActive: z.boolean()
});

function assertPlatformTenantAccess(tenantId: string) {
  if (isPlatformTenant(tenantId)) {
    throw new HttpError(403, "لا يمكن تعديل حساب المنصة من هنا");
  }
}

export async function listPlatformBootstrap(): Promise<PlatformBootstrap> {
  await getAuthContext(UserRole.PLATFORM_ADMIN);

  const tenants = await prisma.tenant.findMany({
    where: { id: { not: PLATFORM_TENANT_ID } },
    orderBy: { createdAt: "desc" },
    include: {
      users: {
        where: { role: UserRole.ADMIN },
        select: { email: true, fullName: true },
        take: 1
      },
      _count: {
        select: {
          users: true,
          circles: true,
          students: true
        }
      }
    }
  });

  return {
    tenants: tenants.map((tenant) => {
      const admin = tenant.users[0] ?? null;
      return {
        id: tenant.id,
        name: tenant.name,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt.toISOString(),
        adminEmail: admin?.email ?? null,
        adminName: admin?.fullName ?? null,
        userCount: tenant._count.users,
        circleCount: tenant._count.circles,
        studentCount: tenant._count.students
      };
    })
  };
}

export async function createPlatformTenant(
  input: z.infer<typeof registerSchema>,
  meta?: RequestMeta
) {
  const auth = await getAuthContext(UserRole.PLATFORM_ADMIN);
  const result = await createTenantWithAdmin(input);

  writeAuditAsync({
    tenantId: result.tenant.id,
    actorId: auth.userId,
    action: AuditAction.TENANT_CREATE,
    entityType: "Tenant",
    entityId: result.tenant.id,
    metadata: {
      mosqueName: input.mosqueName,
      adminEmail: result.admin.email
    },
    ...meta
  });

  return {
    tenant: {
      id: result.tenant.id,
      name: result.tenant.name,
      isActive: result.tenant.isActive,
      createdAt: result.tenant.createdAt.toISOString()
    },
    admin: {
      id: result.admin.id,
      email: result.admin.email,
      fullName: result.admin.fullName
    }
  };
}

export async function updatePlatformTenantStatus(
  tenantId: string,
  input: z.infer<typeof tenantStatusSchema>,
  meta?: RequestMeta
) {
  const auth = await getAuthContext(UserRole.PLATFORM_ADMIN);
  assertPlatformTenantAccess(tenantId);

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { isActive: input.isActive },
    select: { id: true, name: true, isActive: true, createdAt: true }
  });

  writeAuditAsync({
    tenantId: tenant.id,
    actorId: auth.userId,
    action: input.isActive ? AuditAction.TENANT_ACTIVATE : AuditAction.TENANT_DEACTIVATE,
    entityType: "Tenant",
    entityId: tenant.id,
    metadata: { mosqueName: tenant.name },
    ...meta
  });

  return {
    id: tenant.id,
    name: tenant.name,
    isActive: tenant.isActive,
    createdAt: tenant.createdAt.toISOString()
  };
}

export async function deletePlatformTenant(tenantId: string, meta?: RequestMeta) {
  const auth = await getAuthContext(UserRole.PLATFORM_ADMIN);
  assertPlatformTenantAccess(tenantId);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true }
  });

  if (!tenant) {
    throw new HttpError(404, "المسجد غير موجود");
  }

  await prisma.$transaction([
    prisma.evaluationEntry.deleteMany({ where: { tenantId } }),
    prisma.attendanceEntry.deleteMany({ where: { tenantId } }),
    prisma.evaluationSession.deleteMany({ where: { tenantId } }),
    prisma.studentSurahProgress.deleteMany({ where: { tenantId } }),
    prisma.circleTeacher.deleteMany({ where: { tenantId } }),
    prisma.student.deleteMany({ where: { tenantId } }),
    prisma.circle.deleteMany({ where: { tenantId } }),
    prisma.evaluationOption.deleteMany({ where: { tenantId } }),
    prisma.evaluationCriterion.deleteMany({ where: { tenantId } }),
    prisma.auditLog.deleteMany({ where: { tenantId } }),
    prisma.user.deleteMany({ where: { tenantId } }),
    prisma.tenant.delete({ where: { id: tenantId } })
  ]);

  writeAuditAsync({
    actorId: auth.userId,
    action: AuditAction.TENANT_DELETE,
    entityType: "Tenant",
    entityId: tenant.id,
    metadata: { mosqueName: tenant.name },
    ...meta
  });

  return { id: tenant.id };
}
