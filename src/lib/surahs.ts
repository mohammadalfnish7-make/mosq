export const SURAH_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "لم يبدأ",
  IN_PROGRESS: "قيد الحفظ",
  MEMORIZED: "محفوظ",
  NEEDS_REVISION: "يحتاج مراجعة"
};

export const SURAH_STATUS_CYCLE = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "MEMORIZED",
  "NEEDS_REVISION"
] as const;

export type SurahStatusValue = (typeof SURAH_STATUS_CYCLE)[number];
