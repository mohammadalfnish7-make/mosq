import { prisma } from "@/lib/prisma";
import { TeacherWorkspace } from "@/components/TeacherWorkspace";
import { LogoutButton } from "@/components/LogoutButton";
import { getAuthContext } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  const auth = await getAuthContext();

  const circle = await prisma.circle.findFirst({
    where: {
      tenantId: auth.tenantId,
      isActive: true,
      teachers: { some: { teacherId: auth.userId } }
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true }
  });

  if (!circle) {
    return (
      <main className="mx-auto max-w-xl px-5 py-8">
        <div className="mb-4 flex justify-end">
          <LogoutButton />
        </div>
        <h1 className="text-2xl font-bold">لا توجد حلقة بعد</h1>
        <p className="mt-2 text-ink/70">تواصل مع المشرف لإسنادك إلى حلقة.</p>
      </main>
    );
  }

  const students = await prisma.student.findMany({
    where: { tenantId: auth.tenantId, circleId: circle.id, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, fullName: true }
  });

  return (
    <div>
      <div className="mx-auto flex max-w-3xl justify-end px-5 pt-4">
        <LogoutButton />
      </div>
      <TeacherWorkspace circle={circle} students={students} />
    </div>
  );
}
