import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { RequestMeta } from "@/lib/request-meta";

export const AuditAction = {
  AUTH_LOGIN: "auth.login",
  AUTH_LOGIN_FAILED: "auth.login_failed",
  AUTH_REGISTER: "auth.register",
  AUTH_LOGOUT: "auth.logout",
  ACCESS_DENIED: "access.denied",
  ACCESS_UNAUTHENTICATED: "access.unauthenticated",
  CIRCLE_CREATE: "circle.create",
  STUDENT_CREATE: "student.create",
  TEACHER_CREATE: "teacher.create",
  CRITERION_CREATE: "criterion.create",
  OPTION_CREATE: "option.create",
  SESSION_BULK_SAVE: "session.bulk_save",
  MEMORIZATION_UPDATE: "memorization.update",
  SERVER_ERROR: "server.error"
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export type AuditEvent = {
  tenantId?: string | null;
  actorId?: string | null;
  action: AuditAction | string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
} & RequestMeta;

export const auditEventSchema = z.object({
  tenantId: z.string().uuid().nullable().optional(),
  actorId: z.string().uuid().nullable().optional(),
  action: z.string().min(1).max(120),
  entityType: z.string().max(80).optional(),
  entityId: z.string().max(80).optional(),
  metadata: z.record(z.unknown()).optional(),
  ip: z.string().max(80).optional(),
  userAgent: z.string().max(512).optional()
});

export async function writeAudit(event: AuditEvent): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: event.tenantId ?? null,
        actorId: event.actorId ?? null,
        action: event.action,
        entityType: event.entityType ?? null,
        entityId: event.entityId ?? null,
        metadata: event.metadata ? (event.metadata as Prisma.InputJsonValue) : undefined,
        ip: event.ip ?? null,
        userAgent: event.userAgent ?? null
      }
    });
  } catch (error) {
    logger.error("audit.write_failed", error, { action: event.action });
  }
}

export function writeAuditAsync(event: AuditEvent): void {
  void writeAudit(event);
}

export function postAuditFromEdge(requestUrl: string, event: AuditEvent): void {
  const secret = process.env.AUDIT_INTERNAL_SECRET;
  if (!secret) {
    return;
  }

  const url = new URL("/api/internal/audit", requestUrl);

  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-audit-secret": secret
    },
    body: JSON.stringify(event)
  }).catch((error) => {
    logger.error("audit.edge_post_failed", error, { action: event.action });
  });
}
