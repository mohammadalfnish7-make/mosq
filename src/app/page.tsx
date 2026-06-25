import Link from "next/link";
import { getCurrentUser } from "@/server/auth-service";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-6 px-5 py-8">
      <section>
        <p className="text-sm font-semibold text-teal">Mosq MVP</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">نظام إدارة وتقييم الحلقات</h1>
        <p className="mt-3 max-w-xl leading-7 text-ink/75">
          واجهة معلم مخصصة للجوال مع تقييم ديناميكي، وحفظ جماعي، ولوحة إدارة بسيطة للمعايير والطلاب.
        </p>
        {user ? (
          <p className="mt-4 rounded-lg bg-mint px-4 py-3 text-sm font-semibold text-ink">
            مرحباً {user.fullName} ({user.role === "ADMIN" ? "مشرف" : "معلم"})
          </p>
        ) : null}
      </section>

      {user ? (
        <nav className="grid gap-3 sm:grid-cols-2">
          {user.role === "TEACHER" ? (
            <Link
              href="/teacher"
              className="tap-target rounded-lg bg-teal px-5 py-4 text-center font-bold text-white shadow-sm"
            >
              واجهة المعلم
            </Link>
          ) : null}
          {user.role === "ADMIN" ? (
            <Link
              href="/admin"
              className="tap-target rounded-lg border border-ink/15 bg-white px-5 py-4 text-center font-bold text-ink shadow-sm"
            >
              لوحة الإدارة
            </Link>
          ) : null}
          <div className="sm:col-span-2 flex justify-center">
            <LogoutButton />
          </div>
        </nav>
      ) : (
        <nav className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/login"
            className="tap-target rounded-lg bg-teal px-5 py-4 text-center font-bold text-white shadow-sm"
          >
            تسجيل الدخول
          </Link>
          {/* <Link
            href="/register"
            className="tap-target rounded-lg border border-ink/15 bg-white px-5 py-4 text-center font-bold text-ink shadow-sm"
          >
            تسجيل مسجد جديد
          </Link> */}
        </nav>
      )}
    </main>
  );
}
