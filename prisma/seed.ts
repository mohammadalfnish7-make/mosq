import { PrismaClient, InputType, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000010",
      tenantId: tenant.id,
      fullName: "مشرف النظام",
      phone: "0999000000",
      role: UserRole.ADMIN
    }
  });

  const teacher = await prisma.user.upsert({
    where: { id: "00000000-0000-0000-0000-000000000011" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000011",
      tenantId: tenant.id,
      fullName: "المعلم أحمد",
      phone: "0999111111",
      role: UserRole.TEACHER
    }
  });

  const circle = await prisma.circle.upsert({
    where: { id: "00000000-0000-0000-0000-000000000020" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000020",
      tenantId: tenant.id,
      name: "حلقة الفجر"
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

  console.log({ tenant: tenant.name, admin: admin.fullName, teacher: teacher.fullName, circle: circle.name });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
