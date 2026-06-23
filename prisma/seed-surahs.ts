import { PrismaClient } from "@prisma/client";
import { SURAHS } from "./surahs-data";

export async function seedSurahs(prisma: PrismaClient) {
  for (const surah of SURAHS) {
    await prisma.surah.upsert({
      where: { number: surah.number },
      update: {
        nameAr: surah.nameAr,
        nameEn: surah.nameEn,
        ayahCount: surah.ayahCount,
        juz: surah.juz
      },
      create: {
        number: surah.number,
        nameAr: surah.nameAr,
        nameEn: surah.nameEn,
        ayahCount: surah.ayahCount,
        juz: surah.juz
      }
    });
  }
}
