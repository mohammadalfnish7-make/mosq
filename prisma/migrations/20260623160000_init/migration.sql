CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TEACHER');
CREATE TYPE "InputType" AS ENUM ('OPTIONS', 'COUNTER');
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

CREATE TABLE "tenants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "full_name" TEXT NOT NULL,
  "phone" TEXT,
  "role" "UserRole" NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "circles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "circles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "circle_teachers" (
  "tenant_id" UUID NOT NULL,
  "circle_id" UUID NOT NULL,
  "teacher_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "circle_teachers_pkey" PRIMARY KEY ("tenant_id", "circle_id", "teacher_id")
);

CREATE TABLE "students" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "circle_id" UUID NOT NULL,
  "full_name" TEXT NOT NULL,
  "guardian_phone" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evaluation_criteria" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "input_type" "InputType" NOT NULL,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evaluation_criteria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evaluation_options" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "criterion_id" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "score" DECIMAL(6,2),
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "evaluation_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evaluation_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "circle_id" UUID NOT NULL,
  "teacher_id" UUID NOT NULL,
  "session_date" DATE NOT NULL,
  "period_code" TEXT NOT NULL DEFAULT 'default',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evaluation_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "session_id" UUID NOT NULL,
  "student_id" UUID NOT NULL,
  "status" "AttendanceStatus" NOT NULL,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attendance_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evaluation_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "session_id" UUID NOT NULL,
  "student_id" UUID NOT NULL,
  "criterion_id" UUID NOT NULL,
  "option_id" UUID,
  "counter_value" INTEGER,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "evaluation_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "evaluation_entries_value_shape_check" CHECK (
    ("option_id" IS NOT NULL AND "counter_value" IS NULL)
    OR
    ("option_id" IS NULL AND "counter_value" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "users_tenant_id_id_key" ON "users"("tenant_id", "id");
CREATE INDEX "users_tenant_id_role_idx" ON "users"("tenant_id", "role");
CREATE UNIQUE INDEX "circles_tenant_id_id_key" ON "circles"("tenant_id", "id");
CREATE INDEX "circles_tenant_id_is_active_idx" ON "circles"("tenant_id", "is_active");
CREATE INDEX "circle_teachers_tenant_id_teacher_id_idx" ON "circle_teachers"("tenant_id", "teacher_id");
CREATE UNIQUE INDEX "students_tenant_id_id_key" ON "students"("tenant_id", "id");
CREATE INDEX "students_tenant_id_circle_id_is_active_idx" ON "students"("tenant_id", "circle_id", "is_active");
CREATE UNIQUE INDEX "evaluation_criteria_tenant_id_id_key" ON "evaluation_criteria"("tenant_id", "id");
CREATE UNIQUE INDEX "evaluation_criteria_tenant_id_code_key" ON "evaluation_criteria"("tenant_id", "code");
CREATE INDEX "evaluation_criteria_tenant_id_is_active_display_order_idx" ON "evaluation_criteria"("tenant_id", "is_active", "display_order");
CREATE UNIQUE INDEX "evaluation_options_tenant_id_id_key" ON "evaluation_options"("tenant_id", "id");
CREATE UNIQUE INDEX "evaluation_options_tenant_id_criterion_id_value_key" ON "evaluation_options"("tenant_id", "criterion_id", "value");
CREATE INDEX "evaluation_options_tenant_id_criterion_id_is_active_display_order_idx" ON "evaluation_options"("tenant_id", "criterion_id", "is_active", "display_order");
CREATE UNIQUE INDEX "evaluation_sessions_tenant_id_id_key" ON "evaluation_sessions"("tenant_id", "id");
CREATE UNIQUE INDEX "evaluation_sessions_tenant_id_circle_id_session_date_period_code_key" ON "evaluation_sessions"("tenant_id", "circle_id", "session_date", "period_code");
CREATE INDEX "evaluation_sessions_tenant_id_teacher_id_session_date_idx" ON "evaluation_sessions"("tenant_id", "teacher_id", "session_date");
CREATE UNIQUE INDEX "attendance_entries_tenant_id_session_id_student_id_key" ON "attendance_entries"("tenant_id", "session_id", "student_id");
CREATE INDEX "attendance_entries_tenant_id_student_id_idx" ON "attendance_entries"("tenant_id", "student_id");
CREATE UNIQUE INDEX "evaluation_entries_tenant_id_session_id_student_id_criterion_id_key" ON "evaluation_entries"("tenant_id", "session_id", "student_id", "criterion_id");
CREATE INDEX "evaluation_entries_tenant_id_student_id_idx" ON "evaluation_entries"("tenant_id", "student_id");
CREATE INDEX "evaluation_entries_tenant_id_criterion_id_idx" ON "evaluation_entries"("tenant_id", "criterion_id");

ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "circles" ADD CONSTRAINT "circles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "circle_teachers" ADD CONSTRAINT "circle_teachers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "circle_teachers" ADD CONSTRAINT "circle_teachers_tenant_id_circle_id_fkey" FOREIGN KEY ("tenant_id", "circle_id") REFERENCES "circles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "circle_teachers" ADD CONSTRAINT "circle_teachers_tenant_id_teacher_id_fkey" FOREIGN KEY ("tenant_id", "teacher_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "students" ADD CONSTRAINT "students_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "students" ADD CONSTRAINT "students_tenant_id_circle_id_fkey" FOREIGN KEY ("tenant_id", "circle_id") REFERENCES "circles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_criteria" ADD CONSTRAINT "evaluation_criteria_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_options" ADD CONSTRAINT "evaluation_options_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_options" ADD CONSTRAINT "evaluation_options_tenant_id_criterion_id_fkey" FOREIGN KEY ("tenant_id", "criterion_id") REFERENCES "evaluation_criteria"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluation_sessions" ADD CONSTRAINT "evaluation_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_sessions" ADD CONSTRAINT "evaluation_sessions_tenant_id_circle_id_fkey" FOREIGN KEY ("tenant_id", "circle_id") REFERENCES "circles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_sessions" ADD CONSTRAINT "evaluation_sessions_tenant_id_teacher_id_fkey" FOREIGN KEY ("tenant_id", "teacher_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_entries" ADD CONSTRAINT "attendance_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_entries" ADD CONSTRAINT "attendance_entries_tenant_id_session_id_fkey" FOREIGN KEY ("tenant_id", "session_id") REFERENCES "evaluation_sessions"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_entries" ADD CONSTRAINT "attendance_entries_tenant_id_student_id_fkey" FOREIGN KEY ("tenant_id", "student_id") REFERENCES "students"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_entries" ADD CONSTRAINT "attendance_entries_tenant_id_created_by_fkey" FOREIGN KEY ("tenant_id", "created_by") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_entries" ADD CONSTRAINT "evaluation_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_entries" ADD CONSTRAINT "evaluation_entries_tenant_id_session_id_fkey" FOREIGN KEY ("tenant_id", "session_id") REFERENCES "evaluation_sessions"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluation_entries" ADD CONSTRAINT "evaluation_entries_tenant_id_student_id_fkey" FOREIGN KEY ("tenant_id", "student_id") REFERENCES "students"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_entries" ADD CONSTRAINT "evaluation_entries_tenant_id_criterion_id_fkey" FOREIGN KEY ("tenant_id", "criterion_id") REFERENCES "evaluation_criteria"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_entries" ADD CONSTRAINT "evaluation_entries_tenant_id_option_id_fkey" FOREIGN KEY ("tenant_id", "option_id") REFERENCES "evaluation_options"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_entries" ADD CONSTRAINT "evaluation_entries_tenant_id_created_by_fkey" FOREIGN KEY ("tenant_id", "created_by") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
