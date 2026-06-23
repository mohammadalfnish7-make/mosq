import { SurahStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  memorizationStatusFromOptionValue,
  mergeSurahProgressRows
} from "@/lib/memorization-progress";

describe("memorizationStatusFromOptionValue", () => {
  it("maps evaluation options to surah status", () => {
    expect(memorizationStatusFromOptionValue("excellent")).toBe(SurahStatus.MEMORIZED);
    expect(memorizationStatusFromOptionValue("good")).toBe(SurahStatus.IN_PROGRESS);
    expect(memorizationStatusFromOptionValue("needs_followup")).toBe(SurahStatus.NEEDS_REVISION);
    expect(memorizationStatusFromOptionValue("unknown")).toBeNull();
  });
});

describe("mergeSurahProgressRows", () => {
  const surah = { number: 1, nameAr: "الفاتحة", juz: 1 };

  it("fills gaps from session evaluations when no stored progress exists", () => {
    const derived = [
      {
        surahNumber: 1,
        status: SurahStatus.MEMORIZED,
        updatedAt: new Date("2026-06-24T10:00:00Z"),
        surah
      }
    ];

    const merged = mergeSurahProgressRows([], derived);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.status).toBe(SurahStatus.MEMORIZED);
  });

  it("keeps the newest update between stored progress and evaluations", () => {
    const stored = [
      {
        surahNumber: 1,
        status: SurahStatus.IN_PROGRESS,
        updatedAt: new Date("2026-06-23T10:00:00Z"),
        surah
      }
    ];
    const derived = [
      {
        surahNumber: 1,
        status: SurahStatus.MEMORIZED,
        updatedAt: new Date("2026-06-24T10:00:00Z"),
        surah
      }
    ];

    const merged = mergeSurahProgressRows(stored, derived);
    expect(merged[0]?.status).toBe(SurahStatus.MEMORIZED);
  });
});
