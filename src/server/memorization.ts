import { StudentApprovalStatus, SurahStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { AuditAction, writeAuditAsync } from "@/lib/audit";
import { pickCurrentSurah } from "@/lib/current-surah";
import { prisma } from "@/lib/prisma";
import { getAuthContext, assertTeacherCircleAccess } from "@/server/auth";
import { HttpError } from "@/server/http";

const uuid = z.string().uuid();

export const memorizationQuerySchema = z.object({
  studentId: uuid,
  circleId: uuid
});

export const memorizationItemSchema = z.object({
  surahNumber: z.number().int().min(1).max(114),
  status: z.nativeEnum(SurahStatus),
  notes: z.string().trim().max(500).optional()
});

export const memorizationUpdateSchema = z.object({
  studentId: uuid,
  circleId: uuid,
  items: z.array(memorizationItemSchema).min(1).max(114)
});

async function assertStudentInCircle(tenantId: string, circleId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: {
      tenantId,
      id: studentId,
      circleId,
      isActive: true,
      approvalStatus: StudentApprovalStatus.APPROVED
    },
    select: { id: true, fullName: true, circleId: true }
  });

  if (!student) {
    throw new HttpError(404, "الطالب غير موجود في هذه الحلقة");
  }

  return student;
}

export async function getStudentMemorizationMap(input: z.infer<typeof memorizationQuerySchema>) {
  const auth = await getAuthContext(UserRole.TEACHER);
  await assertTeacherCircleAccess(auth.tenantId, auth.userId, input.circleId);
  const student = await assertStudentInCircle(auth.tenantId, input.circleId, input.studentId);

  const [surahs, progressRows] = await Promise.all([
    prisma.surah.findMany({ orderBy: { number: "asc" } }),
    prisma.studentSurahProgress.findMany({
      where: { tenantId: auth.tenantId, studentId: input.studentId },
      select: {
        surahNumber: true,
        status: true,
        notes: true,
        updatedAt: true,
        surah: { select: { number: true, nameAr: true } }
      }
    })
  ]);

  const progressBySurah = new Map(progressRows.map((row) => [row.surahNumber, row]));

  const items = surahs.map((surah) => {
    const progress = progressBySurah.get(surah.number);
    return {
      number: surah.number,
      nameAr: surah.nameAr,
      nameEn: surah.nameEn,
      ayahCount: surah.ayahCount,
      juz: surah.juz,
      status: progress?.status ?? SurahStatus.NOT_STARTED,
      notes: progress?.notes ?? null,
      updatedAt: progress?.updatedAt ?? null
    };
  });

  const summary = {
    total: 114,
    memorized: items.filter((item) => item.status === SurahStatus.MEMORIZED).length,
    inProgress: items.filter((item) => item.status === SurahStatus.IN_PROGRESS).length,
    needsRevision: items.filter((item) => item.status === SurahStatus.NEEDS_REVISION).length,
    notStarted: items.filter((item) => item.status === SurahStatus.NOT_STARTED).length
  };

  const currentSurah = pickCurrentSurah(progressRows);

  return {
    student: { id: student.id, fullName: student.fullName },
    currentSurah,
    summary,
    items
  };
}

export async function updateStudentMemorization(input: z.infer<typeof memorizationUpdateSchema>) {
  const auth = await getAuthContext(UserRole.TEACHER);
  await assertTeacherCircleAccess(auth.tenantId, auth.userId, input.circleId);
  const student = await assertStudentInCircle(auth.tenantId, input.circleId, input.studentId);

  const surahNumbers = new Set(input.items.map((item) => item.surahNumber));
  const surahs = await prisma.surah.findMany({
    where: { number: { in: [...surahNumbers] } },
    select: { number: true }
  });

  if (surahs.length !== surahNumbers.size) {
    throw new HttpError(400, "رقم سورة غير صالح");
  }

  await prisma.$transaction(
    input.items.map((item) =>
      prisma.studentSurahProgress.upsert({
        where: {
          tenantId_studentId_surahNumber: {
            tenantId: auth.tenantId,
            studentId: input.studentId,
            surahNumber: item.surahNumber
          }
        },
        update: {
          status: item.status,
          notes: item.notes ?? null,
          updatedBy: auth.userId
        },
        create: {
          tenantId: auth.tenantId,
          studentId: input.studentId,
          surahNumber: item.surahNumber,
          status: item.status,
          notes: item.notes ?? null,
          updatedBy: auth.userId
        }
      })
    )
  );

  writeAuditAsync({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    action: AuditAction.MEMORIZATION_UPDATE,
    entityType: "Student",
    entityId: student.id,
    metadata: {
      circleId: input.circleId,
      updatedCount: input.items.length,
      surahNumbers: input.items.map((item) => item.surahNumber)
    }
  });

  return getStudentMemorizationMap({
    studentId: input.studentId,
    circleId: input.circleId
  });
}

export async function listCircleStudentsForTeacher(circleId: string) {
  const auth = await getAuthContext(UserRole.TEACHER);
  await assertTeacherCircleAccess(auth.tenantId, auth.userId, circleId);

  return prisma.student.findMany({
    where: {
      tenantId: auth.tenantId,
      circleId,
      isActive: true,
      approvalStatus: StudentApprovalStatus.APPROVED
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, fullName: true }
  });
}
