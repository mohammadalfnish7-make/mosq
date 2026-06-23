import type { AttendanceStatus } from "@prisma/client";

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "حاضر",
  ABSENT: "غائب",
  LATE: "متأخر",
  EXCUSED: "معذور"
};

export const PERIOD_LABELS: Record<string, string> = {
  default: "الحصة",
  fajr: "الفجر",
  asr: "العصر",
  isha: "العشاء"
};

export function periodLabel(code: string) {
  return PERIOD_LABELS[code] ?? code;
}
