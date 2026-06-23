import { InputType, UserRole } from "@prisma/client";
import { z } from "zod";
import { AuditAction, writeAuditAsync } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { getAuthContext } from "@/server/auth";
import { HttpError } from "@/server/http";
import type { AdminBootstrap } from "@/types/admin-bootstrap";

const uuid = z.string().uuid();

export const circleSchema = z.object({
  name: z.string().trim().min(2).max(80)
});

export const studentSchema = z.object({
  circleId: uuid,
  fullName: z.string().trim().min(2).max(120),
  guardianPhone: z.string().trim().max(30).optional()
});

export const teacherSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  phone: z.string().trim().max(30).optional(),
  circleId: uuid.optional()
});

export const criterionSchema = z.object({
  code: z.string().trim().min(2).max(50).regex(/^[a-z0-9_]+$/),
  label: z.string().trim().min(2).max(80),
  inputType: z.nativeEnum(InputType),
  displayOrder: z.number().int().min(0).max(999).default(0)
});

export const optionSchema = z.object({
  criterionId: uuid,
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(80).regex(/^[a-z0-9_]+$/),
  score: z.number().min(-999).max(999).optional(),
  displayOrder: z.number().int().min(0).max(999).default(0)
});

export async function listAdminBootstrap(): Promise<AdminBootstrap> {
  const auth = await getAuthContext(UserRole.ADMIN);

  const [circles, teachers, students, criteria] = await Promise.all([
    prisma.circle.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, isActive: true }
    }),
    prisma.user.findMany({
      where: { tenantId: auth.tenantId, role: UserRole.TEACHER, isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, fullName: true }
    }),
    prisma.student.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { createdAt: "asc" },
      select: { id: true, fullName: true, guardianPhone: true, circleId: true, isActive: true }
    }),
    prisma.evaluationCriterion.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        code: true,
        label: true,
        inputType: true,
        displayOrder: true,
        isActive: true,
        options: {
          orderBy: [{ displayOrder: "asc" }],
          select: { id: true, label: true, value: true, score: true, displayOrder: true, isActive: true }
        }
      }
    })
  ]);

  return {
    circles,
    teachers,
    students,
    criteria: criteria.map((criterion) => ({
      ...criterion,
      options: criterion.options.map((option) => ({
        ...option,
        score: option.score !== null ? Number(option.score) : null
      }))
    }))
  };
}

export async function createCircle(input: z.infer<typeof circleSchema>) {
  const auth = await getAuthContext(UserRole.ADMIN);
  const circle = await prisma.circle.create({
    data: { tenantId: auth.tenantId, name: input.name },
    select: { id: true, name: true }
  });

  writeAuditAsync({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    action: AuditAction.CIRCLE_CREATE,
    entityType: "Circle",
    entityId: circle.id,
    metadata: { name: circle.name }
  });

  return circle;
}

export async function createStudent(input: z.infer<typeof studentSchema>) {
  const auth = await getAuthContext(UserRole.ADMIN);
  const student = await prisma.student.create({
    data: {
      tenantId: auth.tenantId,
      circleId: input.circleId,
      fullName: input.fullName,
      guardianPhone: input.guardianPhone
    },
    select: { id: true, fullName: true, circleId: true }
  });

  writeAuditAsync({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    action: AuditAction.STUDENT_CREATE,
    entityType: "Student",
    entityId: student.id,
    metadata: { fullName: student.fullName, circleId: student.circleId }
  });

  return student;
}

export async function createTeacher(input: z.infer<typeof teacherSchema>) {
  const auth = await getAuthContext(UserRole.ADMIN);
  const email = input.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new HttpError(409, "البريد الإلكتروني مستخدم بالفعل");
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const teacher = await tx.user.create({
      data: {
        tenantId: auth.tenantId,
        email,
        passwordHash,
        fullName: input.fullName,
        phone: input.phone,
        role: UserRole.TEACHER
      },
      select: { id: true, fullName: true, phone: true, email: true }
    });

    if (input.circleId) {
      await tx.circleTeacher.create({
        data: {
          tenantId: auth.tenantId,
          circleId: input.circleId,
          teacherId: teacher.id
        }
      });
    }

    writeAuditAsync({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: AuditAction.TEACHER_CREATE,
      entityType: "User",
      entityId: teacher.id,
      metadata: { email: teacher.email, circleId: input.circleId ?? null }
    });

    return teacher;
  });
}

export async function createCriterion(input: z.infer<typeof criterionSchema>) {
  const auth = await getAuthContext(UserRole.ADMIN);
  const criterion = await prisma.evaluationCriterion.create({
    data: { tenantId: auth.tenantId, ...input },
    select: { id: true, code: true, label: true, inputType: true }
  });

  writeAuditAsync({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    action: AuditAction.CRITERION_CREATE,
    entityType: "EvaluationCriterion",
    entityId: criterion.id,
    metadata: { code: criterion.code, label: criterion.label }
  });

  return criterion;
}

export async function createOption(input: z.infer<typeof optionSchema>) {
  const auth = await getAuthContext(UserRole.ADMIN);
  const option = await prisma.evaluationOption.create({
    data: { tenantId: auth.tenantId, ...input },
    select: { id: true, label: true, value: true, criterionId: true }
  });

  writeAuditAsync({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    action: AuditAction.OPTION_CREATE,
    entityType: "EvaluationOption",
    entityId: option.id,
    metadata: { criterionId: option.criterionId, value: option.value }
  });

  return option;
}
