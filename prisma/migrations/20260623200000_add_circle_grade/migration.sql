ALTER TABLE "circles" ADD COLUMN "grade_code" TEXT;

CREATE INDEX "circles_tenant_id_grade_code_idx" ON "circles"("tenant_id", "grade_code");
