import { StudentApprovalStatus, SurahStatus, UserRole } from "@prisma/client";
import { randomBytes } from "crypto";
import { ATTENDANCE_LABELS, periodLabel } from "@/lib/attendance";
import { pickCurrentSurah } from "@/lib/current-surah";
import { gradeLabel } from "@/lib/syrian-grades";
import { SURAH_STATUS_LABELS } from "@/lib/surahs";
import { prisma } from "@/lib/prisma";
import { getAuthContext, assertTeacherCircleAccess } from "@/server/auth";
import { HttpError } from "@/server/http";
import type { StudentProfile } from "@/types/student-profile";

const HISTORY_LIMIT = 20;

function createShareToken() {
  return randomBytes(24).toString("base64url");
}

async function ensureGuardianShareToken(tenantId: string, studentId: string) {
  const existing = await prisma.student.findFirst({
    where: { tenantId, id: studentId },
    select: { guardianShareToken: true }
  });

  if (!existing) {
    throw new HttpError(404, "الطالب غير موجود");
  }

  if (existing.guardianShareToken) {
    return existing.guardianShareToken;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = createShareToken();
    try {
      const updated = await prisma.student.update({
        where: { tenantId_id: { tenantId, id: studentId } },
        data: { guardianShareToken: token },
        select: { guardianShareToken: true }
      });
      return updated.guardianShareToken!;
    } catch {
      // rare collision — retry
    }
  }

  throw new HttpError(500, "تعذر إنشاء رابط المتابعة");
}

function buildShareUrl(token: string, baseUrl?: string) {
  const origin = baseUrl ?? process.env.APP_URL ?? "";
  if (!origin) return `/p/${token}`;
  return `${origin.replace(/\/$/, "")}/p/${token}`;
}

type StudentRow = {
  id: string;
  tenantId: string;
  fullName: string;
  guardianPhone: string | null;
  approvalStatus: StudentApprovalStatus;
  isActive: boolean;
  createdAt: Date;
  guardianShareToken: string | null;
  circle: { id: string; name: string; gradeCode: string | null };
};

async function loadStudentProfile(
  student: StudentRow,
  options: { includeShareUrl: boolean; baseUrl?: string }
): Promise<StudentProfile> {
  const [progressRows, surahs, attendanceRows, evaluationRows] = await Promise.all([
    prisma.studentSurahProgress.findMany({
      where: { tenantId: student.tenantId, studentId: student.id },
      select: {
        surahNumber: true,
        status: true,
        updatedAt: true,
        surah: { select: { number: true, nameAr: true, juz: true } }
      }
    }),
    prisma.surah.findMany({ orderBy: { number: "asc" }, select: { number: true, nameAr: true, juz: true } }),
    prisma.attendanceEntry.findMany({
      where: { tenantId: student.tenantId, studentId: student.id },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
      select: {
        status: true,
        session: { select: { sessionDate: true, periodCode: true } }
      }
    }),
    prisma.evaluationEntry.findMany({
      where: { tenantId: student.tenantId, studentId: student.id },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
      select: {
        counterValue: true,
        session: { select: { sessionDate: true, periodCode: true } },
        criterion: { select: { label: true } },
        option: { select: { label: true } },
        surah: { select: { nameAr: true } }
      }
    })
  ]);

  const progressBySurah = new Map(progressRows.map((row) => [row.surahNumber, row]));
  const currentSurah = pickCurrentSurah(progressRows);

  const allMemorizationItems = surahs.map((surah) => {
    const progress = progressBySurah.get(surah.number);
    const status = progress?.status ?? SurahStatus.NOT_STARTED;
    return {
      number: surah.number,
      nameAr: surah.nameAr,
      status,
      statusLabel: SURAH_STATUS_LABELS[status],
      juz: surah.juz
    };
  });

  const memorizationItems = allMemorizationItems.filter((item) => item.status !== SurahStatus.NOT_STARTED);

  const summary = {
    total: 114,
    memorized: allMemorizationItems.filter((item) => item.status === SurahStatus.MEMORIZED).length,
    inProgress: allMemorizationItems.filter((item) => item.status === SurahStatus.IN_PROGRESS).length,
    needsRevision: allMemorizationItems.filter((item) => item.status === SurahStatus.NEEDS_REVISION).length,
    notStarted: allMemorizationItems.filter((item) => item.status === SurahStatus.NOT_STARTED).length
  };

  let guardianShareUrl: string | null = null;
  if (options.includeShareUrl) {
    const token = student.guardianShareToken ?? (await ensureGuardianShareToken(student.tenantId, student.id));
    guardianShareUrl = buildShareUrl(token, options.baseUrl);
  }

  return {
    student: {
      id: student.id,
      fullName: student.fullName,
      guardianPhone: student.guardianPhone,
      approvalStatus: student.approvalStatus,
      isActive: student.isActive,
      createdAt: student.createdAt.toISOString()
    },
    circle: {
      id: student.circle.id,
      name: student.circle.name,
      gradeCode: student.circle.gradeCode,
      gradeLabel: gradeLabel(student.circle.gradeCode)
    },
    currentSurah,
    memorization: { summary, items: memorizationItems },
    attendance: attendanceRows.map((row) => ({
      sessionDate: row.session.sessionDate.toISOString().slice(0, 10),
      periodCode: row.session.periodCode,
      periodLabel: periodLabel(row.session.periodCode),
      status: row.status,
      statusLabel: ATTENDANCE_LABELS[row.status]
    })),
    evaluations: evaluationRows.map((row) => ({
      sessionDate: row.session.sessionDate.toISOString().slice(0, 10),
      periodCode: row.session.periodCode,
      periodLabel: periodLabel(row.session.periodCode),
      criterionLabel: row.criterion.label,
      valueLabel: row.option?.label ?? String(row.counterValue ?? "—"),
      surahName: row.surah?.nameAr ?? null
    })),
    guardianShareUrl
  };
}

const studentSelect = {
  id: true,
  tenantId: true,
  fullName: true,
  guardianPhone: true,
  approvalStatus: true,
  isActive: true,
  createdAt: true,
  guardianShareToken: true,
  circleId: true,
  circle: { select: { id: true, name: true, gradeCode: true } }
} as const;

export async function getAdminStudentProfile(studentId: string, baseUrl?: string) {
  const auth = await getAuthContext(UserRole.ADMIN);
  const student = await prisma.student.findFirst({
    where: { tenantId: auth.tenantId, id: studentId },
    select: studentSelect
  });

  if (!student) {
    throw new HttpError(404, "الطالب غير موجود");
  }

  return loadStudentProfile(student, { includeShareUrl: true, baseUrl });
}

export async function getTeacherStudentProfile(studentId: string, baseUrl?: string) {
  const auth = await getAuthContext(UserRole.TEACHER);
  const student = await prisma.student.findFirst({
    where: {
      tenantId: auth.tenantId,
      id: studentId,
      isActive: true,
      approvalStatus: StudentApprovalStatus.APPROVED
    },
    select: studentSelect
  });

  if (!student) {
    throw new HttpError(404, "الطالب غير موجود");
  }

  await assertTeacherCircleAccess(auth.tenantId, auth.userId, student.circleId);
  return loadStudentProfile(student, { includeShareUrl: true, baseUrl });
}

export async function getGuardianStudentProfile(token: string) {
  const student = await prisma.student.findFirst({
    where: {
      guardianShareToken: token,
      isActive: true,
      approvalStatus: StudentApprovalStatus.APPROVED
    },
    select: studentSelect
  });

  if (!student) {
    throw new HttpError(404, "رابط المتابعة غير صالح أو منتهي");
  }

  return loadStudentProfile(student, { includeShareUrl: false });
}

export async function regenerateGuardianShareToken(studentId: string, baseUrl?: string) {
  const auth = await getAuthContext(UserRole.ADMIN);
  const student = await prisma.student.findFirst({
    where: { tenantId: auth.tenantId, id: studentId },
    select: { id: true }
  });

  if (!student) {
    throw new HttpError(404, "الطالب غير موجود");
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = createShareToken();
    try {
      await prisma.student.update({
        where: { tenantId_id: { tenantId: auth.tenantId, id: studentId } },
        data: { guardianShareToken: token }
      });
      return { guardianShareUrl: buildShareUrl(token, baseUrl) };
    } catch {
      // retry on collision
    }
  }

  throw new HttpError(500, "تعذر تجديد رابط المتابعة");
}
