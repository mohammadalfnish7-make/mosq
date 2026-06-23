import { InputType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { bulkSaveSchema, validateCriterionValue } from "@/server/validation";

const uuidA = "00000000-0000-0000-0000-000000000001";
const uuidB = "00000000-0000-0000-0000-000000000002";
const uuidC = "00000000-0000-0000-0000-000000000003";

describe("bulkSaveSchema", () => {
  it("accepts a compact mixed attendance and evaluation batch", () => {
    const result = bulkSaveSchema.safeParse({
      circleId: uuidA,
      sessionDate: "2026-06-23",
      periodCode: "fajr",
      attendance: [{ studentId: uuidB, status: "PRESENT" }],
      evaluations: [{ studentId: uuidB, criterionId: uuidC, counterValue: 5 }]
    });

    expect(result.success).toBe(true);
  });

  it("rejects entries with both optionId and counterValue", () => {
    const result = bulkSaveSchema.safeParse({
      circleId: uuidA,
      sessionDate: "2026-06-23",
      attendance: [],
      evaluations: [{ studentId: uuidB, criterionId: uuidC, optionId: uuidA, counterValue: 1 }]
    });

    expect(result.success).toBe(false);
  });
});

describe("validateCriterionValue", () => {
  it("requires optionId for OPTIONS criteria", () => {
    expect(validateCriterionValue({ inputType: InputType.OPTIONS }, { counterValue: 1 })).toBe(
      "OPTIONS criteria require optionId"
    );
  });

  it("requires counterValue for COUNTER criteria", () => {
    expect(validateCriterionValue({ inputType: InputType.COUNTER }, { optionId: uuidA })).toBe(
      "COUNTER criteria require counterValue"
    );
  });

  it("accepts correct OPTIONS and COUNTER shapes", () => {
    expect(validateCriterionValue({ inputType: InputType.OPTIONS }, { optionId: uuidA })).toBeNull();
    expect(validateCriterionValue({ inputType: InputType.COUNTER }, { counterValue: 0 })).toBeNull();
  });
});
