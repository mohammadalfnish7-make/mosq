import { InputType, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/server/auth";

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

export async function listAdminBootstrap() {
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

  return { circles, teachers, students, criteria };
}

export async function createCircle(input: z.infer<typeof circleSchema>) {
  const auth = await getAuthContext(UserRole.ADMIN);
  return prisma.circle.create({
    data: { tenantId: auth.tenantId, name: input.name },
    select: { id: true, name: true }
  });
}

export async function createStudent(input: z.infer<typeof studentSchema>) {
  const auth = await getAuthContext(UserRole.ADMIN);
  return prisma.student.create({
    data: {
      tenantId: auth.tenantId,
      circleId: input.circleId,
      fullName: input.fullName,
      guardianPhone: input.guardianPhone
    },
    select: { id: true, fullName: true, circleId: true }
  });
}

export async function createTeacher(input: z.infer<typeof teacherSchema>) {
  const auth = await getAuthContext(UserRole.ADMIN);

  return prisma.$transaction(async (tx) => {
    const teacher = await tx.user.create({
      data: {
        tenantId: auth.tenantId,
        fullName: input.fullName,
        phone: input.phone,
        role: UserRole.TEACHER
      },
      select: { id: true, fullName: true, phone: true }
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

    return teacher;
  });
}

export async function createCriterion(input: z.infer<typeof criterionSchema>) {
  const auth = await getAuthContext(UserRole.ADMIN);
  return prisma.evaluationCriterion.create({
    data: { tenantId: auth.tenantId, ...input },
    select: { id: true, code: true, label: true, inputType: true }
  });
}

export async function createOption(input: z.infer<typeof optionSchema>) {
  const auth = await getAuthContext(UserRole.ADMIN);
  return prisma.evaluationOption.create({
    data: { tenantId: auth.tenantId, ...input },
    select: { id: true, label: true, value: true, criterionId: true }
  });
}
