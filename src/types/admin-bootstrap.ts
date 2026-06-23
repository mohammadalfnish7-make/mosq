import type { InputType } from "@prisma/client";

export type AdminBootstrap = {
  circles: { id: string; name: string; isActive: boolean }[];
  teachers: { id: string; fullName: string }[];
  students: {
    id: string;
    fullName: string;
    guardianPhone: string | null;
    circleId: string;
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
