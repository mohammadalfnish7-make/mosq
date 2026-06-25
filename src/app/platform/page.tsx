import { listPlatformBootstrap } from "@/server/platform";
import { PlatformDashboard } from "@/components/PlatformDashboard";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const data = await listPlatformBootstrap();

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-teal">إدارة المنصة</p>
          <h1 className="mt-1 text-2xl font-bold">لوحة مالك المنصة</h1>
          <p className="mt-2 text-sm text-ink/70">
            إدارة المساجد المسجلة وإنشاء حسابات المشرفين الجديدة.
          </p>
        </div>
        <LogoutButton />
      </header>

      <PlatformDashboard data={data} />
    </main>
  );
}
