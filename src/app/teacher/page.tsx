import { prisma } from "@/lib/prisma";
import { TeacherSessionForm } from "@/components/TeacherSessionForm";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  const circle = await prisma.circle.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true }
  });

  if (!circle) {
    return (
      <main className="mx-auto max-w-xl px-5 py-8">
        <h1 className="text-2xl font-bold">لا توجد حلقة بعد</h1>
        <p className="mt-2 text-ink/70">شغل seed أو أضف حلقة من لوحة الإدارة.</p>
      </main>
    );
  }

  return <TeacherSessionForm initialCircle={circle} />;
}
