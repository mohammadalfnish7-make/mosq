import { prisma } from "@/lib/prisma";
import { TeacherSessionForm } from "@/components/TeacherSessionForm";
import { LogoutButton } from "@/components/LogoutButton";
import { getAuthContext } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  const auth = await getAuthContext();

  const circle = await prisma.circle.findFirst({
    where: {
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

  return (
    <div>
      <div className="mx-auto flex max-w-xl justify-end px-5 pt-4">
        <LogoutButton />
      </div>
      <TeacherSessionForm initialCircle={circle} />
    </div>
  );
}
