import Link from "next/link";
import { RegisterForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-5 py-8">
      <section>
        <p className="text-sm font-semibold text-teal">Mosq</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">تسجيل مسجد جديد</h1>
        <p className="mt-3 leading-7 text-ink/75">
          أنشئ حساب مسجد جديد مع حساب مشرف. يمكنك لاحقاً إضافة المعلمين من لوحة الإدارة.
        </p>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <RegisterForm />
      </section>

      <Link className="text-center text-sm font-semibold text-ink/60" href="/">
        العودة للرئيسية
      </Link>
    </main>
  );
}
