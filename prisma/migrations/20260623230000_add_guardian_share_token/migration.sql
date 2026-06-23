ALTER TABLE "students" ADD COLUMN "guardian_share_token" TEXT;

CREATE UNIQUE INDEX "students_guardian_share_token_key" ON "students"("guardian_share_token");
