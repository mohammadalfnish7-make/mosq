import { Prisma, StudentApprovalStatus, SurahStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { AuditAction, writeAuditAsync } from "@/lib/audit";
import { mapCurrentSurahsByStudent } from "@/lib/current-surah";
import { prisma } from "@/lib/prisma";
import { getAuthContext, assertTeacherCircleAccess } from "@/server/auth";
import { HttpError } from "@/server/http";
import { BulkSaveInput, validateCriterionValue } from "@/server/validation";

const uuid = z.string().uuid();

export const teacherStudentSchema = z.object({
  circleId: uuid,
  fullName: z.string().trim().min(2).max(120),
  guardianPhone: z.string().trim().max(30).optional()
});

export const attendanceChoices = [
  { value: "PRESENT", label: "حاضر" },
  { value: "ABSENT", label: "غائب" },
  { value: "LATE", label: "متأخر" },
  { value: "EXCUSED", label: "معذور" }
] as const;

export async function getTeacherSessionForm(input: {
  circleId: string;
  date: string;
  periodCode: string;
}) {
  const auth = await getAuthContext(UserRole.TEACHER);
  await assertTeacherCircleAccess(auth.tenantId, auth.userId, input.circleId);

  const [circle, students, criteria, session] = await Promise.all([
    prisma.circle.findFirst({
      where: { tenantId: auth.tenantId, id: input.circleId, isActive: true },
      select: { id: true, name: true }
    }),
    prisma.student.findMany({
      where: {
        tenantId: auth.tenantId,
        circleId: input.circleId,
        isActive: true,
        approvalStatus: StudentApprovalStatus.APPROVED
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, fullName: true }
    }),
    prisma.evaluationCriterion.findMany({
      where: { tenantId: auth.tenantId, isActive: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        code: true,
        label: true,
        inputType: true,
        options: {
          where: { isActive: true },
          orderBy: [{ displayOrder: "asc" }],
          select: { id: true, label: true, value: true }
        }
      }
    }),
    prisma.evaluationSession.findUnique({
      where: {
        tenantId_circleId_sessionDate_periodCode: {
          tenantId: auth.tenantId,
          circleId: input.circleId,
          sessionDate: new Date(input.date),
          periodCode: input.periodCode
        }
      },
      select: {
        id: true,
        attendanceEntries: {
          select: { studentId: true, status: true }
        },
        evaluationEntries: {
          select: {
            studentId: true,
            criterionId: true,
            optionId: true,
            counterValue: true,
            surahNumber: true
          }
        }
      }
    })
  ]);

  const studentIds = students.map((student) => student.id);

  const [surahs, progressRows] = await Promise.all([
    prisma.surah.findMany({
      orderBy: { number: "asc" },
      select: { number: true, nameAr: true }
    }),
    studentIds.length
      ? prisma.studentSurahProgress.findMany({
          where: {
            tenantId: auth.tenantId,
            studentId: { in: studentIds },
            status: {
              in: [SurahStatus.IN_PROGRESS, SurahStatus.NEEDS_REVISION, SurahStatus.MEMORIZED]
            }
          },
          select: {
            studentId: true,
            surahNumber: true,
            status: true,
            updatedAt: true,
            surah: { select: { number: true, nameAr: true } }
          }
        })
      : Promise.resolve([])
  ]);

  const currentSurahByStudent = mapCurrentSurahsByStudent(progressRows);
  for (const student of students) {
    currentSurahByStudent[student.id] ??= null;
  }

  if (!circle) {
    throw new HttpError(404, "Circle not found");
  }

  return {
    circle,
    session: session ? { id: session.id } : null,
    students: students.map((student) => ({
      ...student,
      currentSurah: currentSurahByStudent[student.id] ?? null
    })),
    surahs,
    criteria: criteria.map((criterion) => ({
      id: criterion.id,
      code: criterion.code,
      label: criterion.label,
      inputType: criterion.inputType,
      options: criterion.options
    })),
    attendanceChoices,
    existing: {
      attendance: session?.attendanceEntries ?? [],
      evaluations: session?.evaluationEntries ?? []
    }
  };
}

export async function bulkSaveTeacherSession(input: BulkSaveInput) {
  const auth = await getAuthContext(UserRole.TEACHER);
  await assertTeacherCircleAccess(auth.tenantId, auth.userId, input.circleId);

  const studentIds = new Set([
    ...input.attendance.map((entry) => entry.studentId),
    ...input.evaluations.map((entry) => entry.studentId)
  ]);

  const criterionIds = new Set(input.evaluations.map((entry) => entry.criterionId));
  const optionIds = new Set(input.evaluations.flatMap((entry) => (entry.optionId ? [entry.optionId] : [])));

  const [students, criteria, options] = await Promise.all([
    prisma.student.findMany({
      where: {
        tenantId: auth.tenantId,
        circleId: input.circleId,
        id: { in: [...studentIds] },
        isActive: true,
        approvalStatus: StudentApprovalStatus.APPROVED
      },
      select: { id: true }
    }),
    prisma.evaluationCriterion.findMany({
      where: { tenantId: auth.tenantId, id: { in: [...criterionIds] }, isActive: true },
      select: { id: true, code: true, inputType: true }
    }),
    prisma.evaluationOption.findMany({
      where: { tenantId: auth.tenantId, id: { in: [...optionIds] }, isActive: true },
      select: { id: true, criterionId: true }
    })
  ]);

  if (students.length !== studentIds.size) {
    throw new HttpError(400, "One or more students are invalid for this circle");
  }

  if (criteria.length !== criterionIds.size) {
    throw new HttpError(400, "One or more criteria are invalid");
  }

  if (options.length !== optionIds.size) {
    throw new HttpError(400, "One or more options are invalid");
  }

  const criteriaById = new Map(criteria.map((criterion) => [criterion.id, criterion]));
  const optionsById = new Map(options.map((option) => [option.id, option]));

  for (const entry of input.evaluations) {
    const criterion = criteriaById.get(entry.criterionId);
    if (!criterion) {
      throw new HttpError(400, "Invalid criterion");
    }

    const typeError = validateCriterionValue(criterion, entry);
    if (typeError) {
      throw new HttpError(400, typeError);
    }

    if (entry.optionId && optionsById.get(entry.optionId)?.criterionId !== entry.criterionId) {
      throw new HttpError(400, "Option does not belong to criterion");
    }

    if (criterion.code === "memorization" && entry.optionId && !entry.surahNumber) {
      throw new HttpError(400, "يجب اختيار السورة عند تقييم الحفظ");
    }
  }

  const surahNumbers = new Set(
    input.evaluations.flatMap((entry) => (entry.surahNumber ? [entry.surahNumber] : []))
  );
  if (surahNumbers.size > 0) {
    const surahs = await prisma.surah.findMany({
      where: { number: { in: [...surahNumbers] } },
      select: { number: true }
    });
    if (surahs.length !== surahNumbers.size) {
      throw new HttpError(400, "رقم سورة غير صالح");
    }
  }

  return prisma.$transaction(async (tx) => {
    const session = await tx.evaluationSession.upsert({
      where: {
        tenantId_circleId_sessionDate_periodCode: {
          tenantId: auth.tenantId,
          circleId: input.circleId,
          sessionDate: new Date(input.sessionDate),
          periodCode: input.periodCode
        }
      },
      update: { teacherId: auth.userId },
      create: {
        tenantId: auth.tenantId,
        circleId: input.circleId,
        teacherId: auth.userId,
        sessionDate: new Date(input.sessionDate),
        periodCode: input.periodCode
      },
      select: { id: true }
    });

    const attendanceOps = input.attendance.map((entry) =>
      tx.attendanceEntry.upsert({
        where: {
          tenantId_sessionId_studentId: {
            tenantId: auth.tenantId,
            sessionId: session.id,
            studentId: entry.studentId
          }
        },
        update: {
          status: entry.status,
          createdBy: auth.userId
        },
        create: {
          tenantId: auth.tenantId,
          sessionId: session.id,
          studentId: entry.studentId,
          status: entry.status,
          createdBy: auth.userId
        }
      })
    );

    const evaluationOps = input.evaluations.map((entry) =>
      tx.evaluationEntry.upsert({
        where: {
          tenantId_sessionId_studentId_criterionId: {
            tenantId: auth.tenantId,
            sessionId: session.id,
            studentId: entry.studentId,
            criterionId: entry.criterionId
          }
        },
        update: {
          optionId: entry.optionId ?? null,
          counterValue: entry.counterValue ?? null,
          surahNumber: entry.surahNumber ?? null,
          createdBy: auth.userId
        },
        create: {
          tenantId: auth.tenantId,
          sessionId: session.id,
          studentId: entry.studentId,
          criterionId: entry.criterionId,
          optionId: entry.optionId ?? null,
          counterValue: entry.counterValue ?? null,
          surahNumber: entry.surahNumber ?? null,
          createdBy: auth.userId
        }
      })
    );

    await Promise.all([...attendanceOps, ...evaluationOps]);

    const result = {
      sessionId: session.id,
      saved: {
        attendance: input.attendance.length,
        evaluations: input.evaluations.length
      }
    };

    writeAuditAsync({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: AuditAction.SESSION_BULK_SAVE,
      entityType: "EvaluationSession",
      entityId: session.id,
      metadata: {
        circleId: input.circleId,
        sessionDate: input.sessionDate,
        periodCode: input.periodCode,
        ...result.saved
      }
    });

    return result;
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
  });
}

export async function createTeacherStudent(input: z.infer<typeof teacherStudentSchema>) {
  const auth = await getAuthContext(UserRole.TEACHER);
  await assertTeacherCircleAccess(auth.tenantId, auth.userId, input.circleId);

  const student = await prisma.student.create({
    data: {
      tenantId: auth.tenantId,
      circleId: input.circleId,
      fullName: input.fullName,
      guardianPhone: input.guardianPhone,
      approvalStatus: StudentApprovalStatus.PENDING
    },
    select: { id: true, fullName: true, circleId: true, approvalStatus: true }
  });

  writeAuditAsync({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    action: AuditAction.STUDENT_CREATE,
    entityType: "Student",
    entityId: student.id,
    metadata: {
      fullName: student.fullName,
      circleId: student.circleId,
      approvalStatus: student.approvalStatus,
      source: "teacher"
    }
  });

  return student;
}
