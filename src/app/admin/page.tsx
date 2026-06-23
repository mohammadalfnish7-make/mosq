import { listAdminBootstrap } from "@/server/admin";
import { AdminDashboard } from "@/components/AdminDashboard";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const data = await listAdminBootstrap();

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-teal">لوحة الإدارة</p>
          <h1 className="mt-1 text-2xl font-bold">إعداد الحلقات والمعايير</h1>
          <p className="mt-2 text-sm text-ink/70">أضف الحلقات والمعلمين والطلاب ومعايير التقييم من هنا.</p>
        </div>
        <LogoutButton />
      </header>

      <AdminDashboard data={data} />
    </main>
  );
}
