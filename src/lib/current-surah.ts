import { SurahStatus } from "@prisma/client";
import { SURAH_STATUS_LABELS } from "@/lib/surahs";

export type CurrentSurah = {
  number: number;
  nameAr: string;
  status: SurahStatus;
  statusLabel: string;
};

type ProgressRow = {
  surahNumber: number;
  status: SurahStatus;
  updatedAt: Date;
  surah: { number: number; nameAr: string };
};

const STATUS_PRIORITY: SurahStatus[] = [
  SurahStatus.IN_PROGRESS,
  SurahStatus.NEEDS_REVISION,
  SurahStatus.MEMORIZED
];

export function pickCurrentSurah(rows: ProgressRow[]): CurrentSurah | null {
  for (const status of STATUS_PRIORITY) {
    const matches = rows.filter((row) => row.status === status);
    if (matches.length === 0) continue;
    matches.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const row = matches[0];
    return {
      number: row.surah.number,
      nameAr: row.surah.nameAr,
      status: row.status,
      statusLabel: SURAH_STATUS_LABELS[row.status]
    };
  }
  return null;
}

export function mapCurrentSurahsByStudent(
  rows: (ProgressRow & { studentId: string })[]
): Record<string, CurrentSurah | null> {
  const byStudent = new Map<string, ProgressRow[]>();
  for (const row of rows) {
    const list = byStudent.get(row.studentId) ?? [];
    list.push(row);
    byStudent.set(row.studentId, list);
  }

  const result: Record<string, CurrentSurah | null> = {};
  for (const [studentId, studentRows] of byStudent) {
    result[studentId] = pickCurrentSurah(studentRows);
  }
  return result;
}
