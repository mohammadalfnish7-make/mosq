-- AlterTable
ALTER TABLE "users" ADD COLUMN "email" TEXT;
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT;

-- Backfill placeholder for any existing rows (dev seed will set real values)
UPDATE "users" SET "email" = CONCAT('legacy-', "id", '@mosq.local'), "password_hash" = '$2a$10$placeholder.hash.for.migration.only' WHERE "email" IS NULL;

ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
