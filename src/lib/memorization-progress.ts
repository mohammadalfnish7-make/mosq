import { Prisma, PrismaClient, SurahStatus } from "@prisma/client";

export type SurahProgressSnapshot = {
  surahNumber: number;
  status: SurahStatus;
  updatedAt: Date;
  surah: { number: number; nameAr: string; juz?: number };
};

export function memorizationStatusFromOptionValue(value: string): SurahStatus | null {
  switch (value) {
    case "excellent":
      return SurahStatus.MEMORIZED;
    case "good":
      return SurahStatus.IN_PROGRESS;
    case "needs_followup":
      return SurahStatus.NEEDS_REVISION;
    default:
      return null;
  }
}

export function mergeSurahProgressRows(
  stored: SurahProgressSnapshot[],
  derived: SurahProgressSnapshot[]
): SurahProgressSnapshot[] {
  const bySurah = new Map(stored.map((row) => [row.surahNumber, row]));
  for (const row of derived) {
    const existing = bySurah.get(row.surahNumber);
    if (!existing || row.updatedAt > existing.updatedAt) {
      bySurah.set(row.surahNumber, row);
    }
  }
  return [...bySurah.values()];
}

export async function loadEvaluationDerivedProgress(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  studentIds: string[]
): Promise<Map<string, SurahProgressSnapshot[]>> {
  if (studentIds.length === 0) {
    return new Map();
  }

  const evaluations = await loadMemorizationEvaluationHistory(db, tenantId, studentIds);

  const byStudent = new Map<string, Map<number, SurahProgressSnapshot>>();
  for (const entry of evaluations) {
    const status = memorizationStatusFromOptionValue(entry.optionValue);
    if (!status) continue;

    let bySurah = byStudent.get(entry.studentId);
    if (!bySurah) {
      bySurah = new Map();
      byStudent.set(entry.studentId, bySurah);
    }
    // Latest evaluation per surah is used only to derive the current map status.
    if (bySurah.has(entry.surahNumber)) continue;

    bySurah.set(entry.surahNumber, {
      surahNumber: entry.surahNumber,
      status,
      updatedAt: entry.evaluatedAt,
      surah: entry.surah
    });
  }

  const result = new Map<string, SurahProgressSnapshot[]>();
  for (const [studentId, bySurah] of byStudent) {
    result.set(studentId, [...bySurah.values()]);
  }
  return result;
}

export type MemorizationEvaluationHistoryRow = {
  studentId: string;
  surahNumber: number;
  surahName: string;
  valueLabel: string;
  optionValue: string;
  sessionDate: string;
  periodCode: string;
  evaluatedAt: Date;
  surah: { number: number; nameAr: string; juz?: number };
};

export async function loadMemorizationEvaluationHistory(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  studentIds: string[],
  limit = 50
): Promise<MemorizationEvaluationHistoryRow[]> {
  if (studentIds.length === 0) {
    return [];
  }

  const rows = await db.evaluationEntry.findMany({
    where: {
      tenantId,
      studentId: { in: studentIds },
      surahNumber: { not: null },
      optionId: { not: null },
      criterion: { code: "memorization" }
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      studentId: true,
      surahNumber: true,
      createdAt: true,
      option: { select: { label: true, value: true } },
      surah: { select: { number: true, nameAr: true, juz: true } },
      session: { select: { sessionDate: true, periodCode: true } }
    }
  });

  return rows.flatMap((row) => {
    if (!row.surahNumber || !row.surah || !row.option) return [];
    return [
      {
        studentId: row.studentId,
        surahNumber: row.surahNumber,
        surahName: row.surah.nameAr,
        valueLabel: row.option.label,
        optionValue: row.option.value,
        sessionDate: row.session.sessionDate.toISOString().slice(0, 10),
        periodCode: row.session.periodCode,
        evaluatedAt: row.createdAt,
        surah: row.surah
      }
    ];
  });
}

type SessionMemorizationEvaluation = {
  studentId: string;
  criterionId: string;
  optionId?: string;
  surahNumber?: number;
};

export function buildMemorizationProgressUpserts(
  tx: Prisma.TransactionClient,
  params: {
    tenantId: string;
    teacherId: string;
    evaluations: SessionMemorizationEvaluation[];
    criteriaById: Map<string, { code: string }>;
    optionsById: Map<string, { criterionId: string; value: string }>;
  }
) {
  return params.evaluations.flatMap((entry) => {
    const criterion = params.criteriaById.get(entry.criterionId);
    if (criterion?.code !== "memorization" || !entry.surahNumber || !entry.optionId) {
      return [];
    }

    const option = params.optionsById.get(entry.optionId);
    if (!option || option.criterionId !== entry.criterionId) {
      return [];
    }

    const status = memorizationStatusFromOptionValue(option.value);
    if (!status) {
      return [];
    }

    return [
      tx.studentSurahProgress.upsert({
        where: {
          tenantId_studentId_surahNumber: {
            tenantId: params.tenantId,
            studentId: entry.studentId,
            surahNumber: entry.surahNumber
          }
        },
        update: {
          status,
          updatedBy: params.teacherId
        },
        create: {
          tenantId: params.tenantId,
          studentId: entry.studentId,
          surahNumber: entry.surahNumber,
          status,
          updatedBy: params.teacherId
        }
      })
    ];
  });
}
