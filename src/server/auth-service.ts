import { UserRole } from "@prisma/client";
import { z } from "zod";
import { AuditAction, writeAuditAsync } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { RequestMeta } from "@/lib/request-meta";
import { createSessionToken, sessionCookieOptions, type SessionPayload } from "@/lib/session";
import { HttpError } from "@/server/http";

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128)
});

export const registerSchema = z.object({
  mosqueName: z.string().trim().min(2).max(120),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128)
});

export async function loginUser(input: z.infer<typeof loginSchema>, meta?: RequestMeta) {
  const email = input.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: { select: { isActive: true } } }
  });

  if (!user || !user.isActive) {
    writeAuditAsync({
      action: AuditAction.AUTH_LOGIN_FAILED,
      metadata: { email },
      ...meta
    });
    throw new HttpError(401, "البريد الإلكتروني أو كلمة المرور غير صحيحة");
  }

  if (user.role !== UserRole.PLATFORM_ADMIN && !user.tenant.isActive) {
    writeAuditAsync({
      tenantId: user.tenantId,
      actorId: user.id,
      action: AuditAction.AUTH_LOGIN_FAILED,
      metadata: { email, reason: "tenant_inactive" },
      ...meta
    });
    throw new HttpError(403, "تم إيقاف حساب المسجد. تواصل مع إدارة المنصة.");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    writeAuditAsync({
      tenantId: user.tenantId,
      actorId: user.id,
      action: AuditAction.AUTH_LOGIN_FAILED,
      metadata: { email },
      ...meta
    });
    throw new HttpError(401, "البريد الإلكتروني أو كلمة المرور غير صحيحة");
  }

  const session = await buildSession(user);
  const token = await createSessionToken(session);

  writeAuditAsync({
    tenantId: user.tenantId,
    actorId: user.id,
    action: AuditAction.AUTH_LOGIN,
    entityType: "User",
    entityId: user.id,
    ...meta
  });

  return {
    user: publicUser(session),
    cookie: sessionCookieOptions(token)
  };
}

export async function createTenantWithAdmin(input: z.infer<typeof registerSchema>) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new HttpError(409, "البريد الإلكتروني مستخدم بالفعل");
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: input.mosqueName }
    });

    const admin = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email,
        passwordHash,
        fullName: input.fullName,
        role: UserRole.ADMIN
      },
      select: { id: true, email: true, fullName: true, tenantId: true, role: true }
    });

    return { tenant, admin };
  });
}

export async function registerMosque(input: z.infer<typeof registerSchema>, meta?: RequestMeta) {
  const { tenant, admin: user } = await createTenantWithAdmin(input);

  const session = await buildSession(user);
  const token = await createSessionToken(session);

  writeAuditAsync({
    tenantId: user.tenantId,
    actorId: user.id,
    action: AuditAction.AUTH_REGISTER,
    entityType: "Tenant",
    entityId: user.tenantId,
    metadata: { mosqueName: input.mosqueName },
    ...meta
  });

  return {
    user: publicUser(session),
    cookie: sessionCookieOptions(token)
  };
}

export async function getCurrentUser() {
  const { getSession } = await import("@/lib/session");
  const session = await getSession();
  if (!session) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: { id: session.userId, isActive: true },
    select: { id: true, tenantId: true, role: true, fullName: true, email: true }
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    tenantId: user.tenantId,
    role: user.role,
    fullName: user.fullName,
    email: user.email
  };
}

export async function logoutUser(meta?: RequestMeta) {
  const user = await getCurrentUser();
  if (user) {
    writeAuditAsync({
      tenantId: user.tenantId,
      actorId: user.id,
      action: AuditAction.AUTH_LOGOUT,
      entityType: "User",
      entityId: user.id,
      ...meta
    });
  }
}

function buildSession(user: {
  id: string;
  tenantId: string;
  role: UserRole;
  fullName: string;
}): SessionPayload {
  return {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    fullName: user.fullName
  };
}

function publicUser(session: SessionPayload) {
  return {
    id: session.userId,
    tenantId: session.tenantId,
    role: session.role,
    fullName: session.fullName
  };
}
