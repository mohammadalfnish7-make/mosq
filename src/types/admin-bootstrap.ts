import { InputType, StudentApprovalStatus, UserRole } from "@prisma/client";

export type AdminBootstrap = {
  circles: { id: string; name: string; gradeCode: string | null; isActive: boolean }[];
  teachers: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    circleId: string | null;
    isActive: boolean;
  }[];
  students: {
    id: string;
    fullName: string;
    guardianPhone: string | null;
    circleId: string;
    approvalStatus: StudentApprovalStatus;
    isActive: boolean;
  }[];
  criteria: {
    id: string;
    code: string;
    label: string;
    inputType: InputType;
    displayOrder: number;
    isActive: boolean;
    options: {
      id: string;
      label: string;
      value: string;
      score: number | null;
      displayOrder: number;
      isActive: boolean;
    }[];
  }[];
};
