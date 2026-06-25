import type { AttendanceStatus, StudentApprovalStatus, SurahStatus } from "@prisma/client";

export type StudentProfile = {
  student: {
    id: string;
    fullName: string;
    guardianPhone: string | null;
    approvalStatus: StudentApprovalStatus;
    isActive: boolean;
    createdAt: string;
  };
  circle: {
    id: string;
    name: string;
    gradeCode: string | null;
    gradeLabel: string | null;
  };
  currentSurah: {
    number: number;
    nameAr: string;
    status: SurahStatus;
    statusLabel: string;
  } | null;
  memorization: {
    summary: {
      total: number;
      memorized: number;
      inProgress: number;
      needsRevision: number;
      notStarted: number;
    };
    items: {
      number: number;
      nameAr: string;
      status: SurahStatus;
      statusLabel: string;
      juz: number;
    }[];
    evaluations: {
      surahNumber: number;
      surahName: string;
      valueLabel: string;
      sessionDate: string;
      periodLabel: string;
      evaluatedAt: string;
    }[];
  };
  attendance: {
    sessionDate: string;
    periodCode: string;
    periodLabel: string;
    status: AttendanceStatus;
    statusLabel: string;
  }[];
  evaluations: {
    sessionDate: string;
    periodCode: string;
    periodLabel: string;
    criterionLabel: string;
    valueLabel: string;
    surahName: string | null;
  }[];
  guardianShareUrl: string | null;
};
