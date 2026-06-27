import { AttendanceStatus, InputType } from "@prisma/client";
import { z } from "zod";

const uuid = z.string().uuid();

export const guardianPhoneSchema = z
  .string()
  .trim()
  .min(1, "هاتف ولي الأمر مطلوب")
  .max(30);

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "رقم الهاتف مطلوب")
  .max(30);

export const sessionFormQuerySchema = z.object({
  circleId: uuid,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodCode: z.string().min(1).max(40).default("default")
});

export const attendanceEntrySchema = z.object({
  studentId: uuid,
  status: z.nativeEnum(AttendanceStatus)
});

export const evaluationEntrySchema = z
  .object({
    studentId: uuid,
    criterionId: uuid,
    optionId: uuid.optional(),
    counterValue: z.number().int().min(0).max(999).optional(),
    surahNumber: z.number().int().min(1).max(114).optional()
  })
  .refine((entry) => Boolean(entry.optionId) !== (entry.counterValue !== undefined), {
    message: "Send exactly one of optionId or counterValue"
  });

export const bulkSaveSchema = z.object({
  circleId: uuid,
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodCode: z.string().min(1).max(40).default("default"),
  attendance: z.array(attendanceEntrySchema).max(300),
  evaluations: z.array(evaluationEntrySchema).max(3000)
});

export type BulkSaveInput = z.infer<typeof bulkSaveSchema>;

export function validateCriterionValue(
  criterion: { inputType: InputType },
  entry: { optionId?: string; counterValue?: number }
) {
  if (criterion.inputType === InputType.OPTIONS && !entry.optionId) {
    return "OPTIONS criteria require optionId";
  }

  if (criterion.inputType === InputType.OPTIONS && entry.counterValue !== undefined) {
    return "OPTIONS criteria cannot receive counterValue";
  }

  if (criterion.inputType === InputType.COUNTER && entry.counterValue === undefined) {
    return "COUNTER criteria require counterValue";
  }

  if (criterion.inputType === InputType.COUNTER && entry.optionId) {
    return "COUNTER criteria cannot receive optionId";
  }

  return null;
}
