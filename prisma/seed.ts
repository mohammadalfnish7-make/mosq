import { PrismaClient, InputType, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PLATFORM_TENANT_ID } from "../src/lib/platform";
import { seedSurahs } from "./seed-surahs";

const prisma = new PrismaClient();

const DEV_PASSWORD = "password123";
const PLATFORM_ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL ?? "platform@mosq.local";
const PLATFORM_ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD ?? DEV_PASSWORD;

async function main() {
  await seedSurahs(prisma);

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);
  const platformPasswordHash = await bcrypt.hash(PLATFORM_ADMIN_PASSWORD, 12);

  const platformTenant = await prisma.tenant.upsert({
    where: { id: PLATFORM_TENANT_ID },
    update: { name: "منصة Mosq", isActive: true },
    create: {
      id: PLATFORM_TENANT_ID,
      name: "منصة Mosq",
      isActive: true
    }
  });

  const platformAdmin = await prisma.user.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {
      email: PLATFORM_ADMIN_EMAIL,
      passwordHash: platformPasswordHash
    },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      tenantId: platformTenant.id,
      email: PLATFORM_ADMIN_EMAIL,
      passwordHash: platformPasswordHash,
      fullName: "مالك المنصة",
      role: UserRole.PLATFORM_ADMIN
    }
  });

  const tenant = await prisma.tenant.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "مسجد النور"
    }
  });

  const admin = await prisma.user.upsert({
    where: { id: "00000000-0000-0000-0000-000000000010" },
    update: {
      email: "admin@mosq.local",
      passwordHash
    },
    create: {
      id: "00000000-0000-0000-0000-000000000010",
      tenantId: tenant.id,
      email: "admin@mosq.local",
      passwordHash,
      fullName: "مشرف النظام",
      phone: "0999000000",
      role: UserRole.ADMIN
    }
  });

  const teacher = await prisma.user.upsert({
    where: { id: "00000000-0000-0000-0000-000000000011" },
    update: {
      email: "teacher@mosq.local",
      passwordHash
    },
    create: {
      id: "00000000-0000-0000-0000-000000000011",
      tenantId: tenant.id,
      email: "teacher@mosq.local",
      passwordHash,
      fullName: "المعلم أحمد",
      phone: "0999111111",
      role: UserRole.TEACHER
    }
  });

  const circle = await prisma.circle.upsert({
    where: { id: "00000000-0000-0000-0000-000000000020" },
    update: { gradeCode: "g6" },
    create: {
      id: "00000000-0000-0000-0000-000000000020",
      tenantId: tenant.id,
      name: "حلقة الفجر",
      gradeCode: "g6"
    }
  });

  await prisma.circleTeacher.upsert({
    where: {
      tenantId_circleId_teacherId: {
        tenantId: tenant.id,
        circleId: circle.id,
        teacherId: teacher.id
      }
    },
    update: {},
    create: {
      tenantId: tenant.id,
      circleId: circle.id,
      teacherId: teacher.id
    }
  });

  const names = ["عبدالله خالد", "محمد سامر", "عمر ياسر", "أنس محمود", "يوسف علي"];
  for (let index = 0; index < names.length; index += 1) {
    await prisma.student.upsert({
      where: { id: `00000000-0000-0000-0000-00000000003${index}` },
      update: {},
      create: {
        id: `00000000-0000-0000-0000-00000000003${index}`,
        tenantId: tenant.id,
        circleId: circle.id,
        fullName: names[index],
        guardianPhone: `099922222${index}`
      }
    });
  }

  const memorization = await prisma.evaluationCriterion.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "memorization" } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: "memorization",
      label: "الحفظ",
      inputType: InputType.OPTIONS,
      displayOrder: 1
    }
  });

  const behavior = await prisma.evaluationCriterion.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "behavior" } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: "behavior",
      label: "السلوك",
      inputType: InputType.OPTIONS,
      displayOrder: 2
    }
  });

  await prisma.evaluationCriterion.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "prayers" } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: "prayers",
      label: "الصلوات",
      inputType: InputType.COUNTER,
      displayOrder: 3
    }
  });

  const optionSets = [
    { criterionId: memorization.id, label: "ممتاز", value: "excellent", score: 5, displayOrder: 1 },
    { criterionId: memorization.id, label: "جيد", value: "good", score: 3, displayOrder: 2 },
    { criterionId: memorization.id, label: "يحتاج متابعة", value: "needs_followup", score: 1, displayOrder: 3 },
    { criterionId: behavior.id, label: "منضبط", value: "disciplined", score: 5, displayOrder: 1 },
    { criterionId: behavior.id, label: "تنبيه", value: "warning", score: 2, displayOrder: 2 }
  ];

  for (const option of optionSets) {
    await prisma.evaluationOption.upsert({
      where: {
        tenantId_criterionId_value: {
          tenantId: tenant.id,
          criterionId: option.criterionId,
          value: option.value
        }
      },
      update: {},
      create: {
        tenantId: tenant.id,
        ...option
      }
    });
  }

  console.log({
    platformAdmin: {
      name: platformAdmin.fullName,
      email: platformAdmin.email,
      password: PLATFORM_ADMIN_PASSWORD
    },
    tenant: tenant.name,
    admin: { name: admin.fullName, email: admin.email, password: DEV_PASSWORD },
    teacher: { name: teacher.fullName, email: teacher.email, password: DEV_PASSWORD },
    circle: circle.name
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
