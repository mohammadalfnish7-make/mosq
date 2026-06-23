import type { StudentApprovalStatus } from "@prisma/client";

export const STUDENT_APPROVAL_LABELS: Record<StudentApprovalStatus, string> = {
  PENDING: "بانتظار الاعتماد",
  APPROVED: "معتمد"
};
