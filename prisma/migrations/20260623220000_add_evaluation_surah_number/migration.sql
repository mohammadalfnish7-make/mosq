ALTER TABLE "evaluation_entries" ADD COLUMN "surah_number" INTEGER;

ALTER TABLE "evaluation_entries" ADD CONSTRAINT "evaluation_entries_surah_number_fkey"
  FOREIGN KEY ("surah_number") REFERENCES "surahs"("number") ON DELETE SET NULL ON UPDATE CASCADE;
