import { UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
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

export async function loginUser(input: z.infer<typeof loginSchema>) {
  const email = input.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    throw new HttpError(401, "البريد الإلكتروني أو كلمة المرور غير صحيحة");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new HttpError(401, "البريد الإلكتروني أو كلمة المرور غير صحيحة");
  }

  const session = await buildSession(user);
  const token = await createSessionToken(session);

  return {
    user: publicUser(session),
    cookie: sessionCookieOptions(token)
  };
}

export async function registerMosque(input: z.infer<typeof registerSchema>) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new HttpError(409, "البريد الإلكتروني مستخدم بالفعل");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: input.mosqueName }
    });

    return tx.user.create({
      data: {
        tenantId: tenant.id,
        email,
        passwordHash,
        fullName: input.fullName,
        role: UserRole.ADMIN
      }
    });
  });

  const session = await buildSession(user);
  const token = await createSessionToken(session);

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
