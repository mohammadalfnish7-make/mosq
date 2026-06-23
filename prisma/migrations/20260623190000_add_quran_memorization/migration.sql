CREATE TYPE "SurahStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'MEMORIZED', 'NEEDS_REVISION');

CREATE TABLE "surahs" (
  "number" INTEGER NOT NULL,
  "name_ar" TEXT NOT NULL,
  "name_en" TEXT NOT NULL,
  "ayah_count" INTEGER NOT NULL,
  "juz" INTEGER NOT NULL,
  CONSTRAINT "surahs_pkey" PRIMARY KEY ("number")
);

CREATE TABLE "student_surah_progress" (
  "tenant_id" UUID NOT NULL,
  "student_id" UUID NOT NULL,
  "surah_number" INTEGER NOT NULL,
  "status" "SurahStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "notes" TEXT,
  "updated_by" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_surah_progress_pkey" PRIMARY KEY ("tenant_id", "student_id", "surah_number")
);

CREATE INDEX "student_surah_progress_tenant_id_student_id_status_idx"
  ON "student_surah_progress"("tenant_id", "student_id", "status");

ALTER TABLE "student_surah_progress" ADD CONSTRAINT "student_surah_progress_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_surah_progress" ADD CONSTRAINT "student_surah_progress_tenant_id_student_id_fkey"
  FOREIGN KEY ("tenant_id", "student_id") REFERENCES "students"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_surah_progress" ADD CONSTRAINT "student_surah_progress_surah_number_fkey"
  FOREIGN KEY ("surah_number") REFERENCES "surahs"("number") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_surah_progress" ADD CONSTRAINT "student_surah_progress_tenant_id_updated_by_fkey"
  FOREIGN KEY ("tenant_id", "updated_by") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
