-- CreateEnum
CREATE TYPE "StudentApprovalStatus" AS ENUM ('PENDING', 'APPROVED');

-- AlterTable
ALTER TABLE "students" ADD COLUMN "approval_status" "StudentApprovalStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateIndex
CREATE INDEX "students_tenant_id_approval_status_idx" ON "students"("tenant_id", "approval_status");
