import { InputType, StudentApprovalStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { AuditAction, writeAuditAsync } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { getAuthContext } from "@/server/auth";
import { HttpError } from "@/server/http";
import type { AdminBootstrap } from "@/types/admin-bootstrap";

import { isValidGradeCode } from "@/lib/syrian-grades";

const uuid = z.string().uuid();

const gradeCodeSchema = z
  .string()
  .trim()
  .max(40)
  .optional()
  .nullable()
  .refine((value) => value == null || value === "" || isValidGradeCode(value), {
    message: "الصف الدراسي غير صالح"
  })
  .transform((value) => (value ? value : null));

export const circleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  gradeCode: gradeCodeSchema
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

export const circleUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  gradeCode: gradeCodeSchema.optional(),
  isActive: z.boolean().optional()
});

export const studentUpdateSchema = studentSchema.extend({
  isActive: z.boolean().optional(),
  approvalStatus: z.nativeEnum(StudentApprovalStatus).optional()
});

export const teacherUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional().nullable(),
  password: z.string().min(8).max(128).optional(),
  circleId: uuid.nullable().optional(),
  isActive: z.boolean().optional()
});

export const criterionUpdateSchema = z.object({
  label: z.string().trim().min(2).max(80),
  displayOrder: z.number().int().min(0).max(999),
  isActive: z.boolean().optional()
});

export const optionUpdateSchema = z.object({
  label: z.string().trim().min(1).max(80),
  score: z.number().min(-999).max(999).optional().nullable(),
  displayOrder: z.number().int().min(0).max(999),
  isActive: z.boolean().optional()
});

async function assertTenantCircle(tenantId: string, circleId: string) {
  const circle = await prisma.circle.findFirst({
    where: { tenantId, id: circleId },
    select: { id: true }
  });
  if (!circle) {
    throw new HttpError(400, "الحلقة غير صالحة");
  }
}

export async function listAdminBootstrap(): Promise<AdminBootstrap> {
  const auth = await getAuthContext(UserRole.ADMIN);

  const [circles, teachers, students, criteria] = await Promise.all([
    prisma.circle.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, gradeCode: true, isActive: true }
    }),
    prisma.user.findMany({
      where: { tenantId: auth.tenantId, role: UserRole.TEACHER },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        isActive: true,
        circleAssignments: {
          take: 1,
          orderBy: { createdAt: "asc" },
          select: { circleId: true }
        }
      }
    }),
    prisma.student.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: [{ approvalStatus: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        fullName: true,
        guardianPhone: true,
        circleId: true,
        approvalStatus: true,
        isActive: true
      }
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
    teachers: teachers.map((teacher) => ({
      id: teacher.id,
      fullName: teacher.fullName,
      email: teacher.email,
      phone: teacher.phone,
      isActive: teacher.isActive,
      circleId: teacher.circleAssignments[0]?.circleId ?? null
    })),
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
    data: { tenantId: auth.tenantId, name: input.name, gradeCode: input.gradeCode ?? null },
    select: { id: true, name: true, gradeCode: true }
  });

  writeAuditAsync({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    action: AuditAction.CIRCLE_CREATE,
    entityType: "Circle",
    entityId: circle.id,
    metadata: { name: circle.name, gradeCode: circle.gradeCode }
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
      guardianPhone: input.guardianPhone,
      approvalStatus: StudentApprovalStatus.APPROVED
    },
    select: { id: true, fullName: true, circleId: true, approvalStatus: true }
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

export async function updateCircle(id: string, input: z.infer<typeof circleUpdateSchema>) {
  const auth = await getAuthContext(UserRole.ADMIN);
  const circle = await prisma.circle.update({
    where: { tenantId_id: { tenantId: auth.tenantId, id } },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.gradeCode !== undefined ? { gradeCode: input.gradeCode } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
    },
    select: { id: true, name: true, gradeCode: true, isActive: true }
  });

  writeAuditAsync({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    action: AuditAction.CIRCLE_UPDATE,
    entityType: "Circle",
    entityId: circle.id,
    metadata: { name: circle.name, gradeCode: circle.gradeCode, isActive: circle.isActive }
  });

  return circle;
}

export async function updateStudent(id: string, input: z.infer<typeof studentUpdateSchema>) {
  const auth = await getAuthContext(UserRole.ADMIN);
  await assertTenantCircle(auth.tenantId, input.circleId);

  const existing = await prisma.student.findFirst({
    where: { tenantId: auth.tenantId, id },
    select: { approvalStatus: true }
  });
  if (!existing) {
    throw new HttpError(404, "الطالب غير موجود");
  }

  const student = await prisma.student.update({
    where: { tenantId_id: { tenantId: auth.tenantId, id } },
    data: {
      fullName: input.fullName,
      circleId: input.circleId,
      guardianPhone: input.guardianPhone ?? null,
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.approvalStatus !== undefined ? { approvalStatus: input.approvalStatus } : {})
    },
    select: {
      id: true,
      fullName: true,
      circleId: true,
      approvalStatus: true,
      isActive: true
    }
  });

  const action =
    existing.approvalStatus === StudentApprovalStatus.PENDING &&
    student.approvalStatus === StudentApprovalStatus.APPROVED
      ? AuditAction.STUDENT_APPROVE
      : AuditAction.STUDENT_UPDATE;

  writeAuditAsync({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    action,
    entityType: "Student",
    entityId: student.id,
    metadata: {
      fullName: student.fullName,
      circleId: student.circleId,
      approvalStatus: student.approvalStatus,
      isActive: student.isActive
    }
  });

  return student;
}

export async function updateTeacher(id: string, input: z.infer<typeof teacherUpdateSchema>) {
  const auth = await getAuthContext(UserRole.ADMIN);
  const email = input.email.toLowerCase();

  const existing = await prisma.user.findFirst({
    where: { tenantId: auth.tenantId, id, role: UserRole.TEACHER }
  });
  if (!existing) {
    throw new HttpError(404, "المعلم غير موجود");
  }

  const emailTaken = await prisma.user.findFirst({
    where: { email, id: { not: id } }
  });
  if (emailTaken) {
    throw new HttpError(409, "البريد الإلكتروني مستخدم بالفعل");
  }

  if (input.circleId) {
    await assertTenantCircle(auth.tenantId, input.circleId);
  }

  const passwordHash = input.password ? await hashPassword(input.password) : undefined;

  return prisma.$transaction(async (tx) => {
    const teacher = await tx.user.update({
      where: { tenantId_id: { tenantId: auth.tenantId, id } },
      data: {
        fullName: input.fullName,
        email,
        phone: input.phone ?? null,
        ...(passwordHash ? { passwordHash } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
      },
      select: { id: true, fullName: true, email: true, phone: true, isActive: true }
    });

    if (input.circleId !== undefined) {
      await tx.circleTeacher.deleteMany({
        where: { tenantId: auth.tenantId, teacherId: id }
      });
      if (input.circleId) {
        await tx.circleTeacher.create({
          data: { tenantId: auth.tenantId, circleId: input.circleId, teacherId: id }
        });
      }
    }

    writeAuditAsync({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: AuditAction.TEACHER_UPDATE,
      entityType: "User",
      entityId: teacher.id,
      metadata: {
        email: teacher.email,
        circleId: input.circleId ?? null,
        isActive: teacher.isActive,
        passwordChanged: Boolean(passwordHash)
      }
    });

    return teacher;
  });
}

export async function updateCriterion(id: string, input: z.infer<typeof criterionUpdateSchema>) {
  const auth = await getAuthContext(UserRole.ADMIN);
  const criterion = await prisma.evaluationCriterion.update({
    where: { tenantId_id: { tenantId: auth.tenantId, id } },
    data: {
      label: input.label,
      displayOrder: input.displayOrder,
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
    },
    select: { id: true, code: true, label: true, displayOrder: true, isActive: true }
  });

  writeAuditAsync({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    action: AuditAction.CRITERION_UPDATE,
    entityType: "EvaluationCriterion",
    entityId: criterion.id,
    metadata: { label: criterion.label, isActive: criterion.isActive }
  });

  return criterion;
}

export async function updateOption(id: string, input: z.infer<typeof optionUpdateSchema>) {
  const auth = await getAuthContext(UserRole.ADMIN);
  const option = await prisma.evaluationOption.update({
    where: { tenantId_id: { tenantId: auth.tenantId, id } },
    data: {
      label: input.label,
      displayOrder: input.displayOrder,
      score: input.score ?? null,
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
    },
    select: { id: true, label: true, value: true, criterionId: true, isActive: true }
  });

  writeAuditAsync({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    action: AuditAction.OPTION_UPDATE,
    entityType: "EvaluationOption",
    entityId: option.id,
    metadata: { label: option.label, isActive: option.isActive }
  });

  return option;
}
