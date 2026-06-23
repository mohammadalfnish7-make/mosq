"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";
  const nextPath = searchParams.get("next");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!isLogin) {
      const mosqueName = String(form.get("mosqueName") ?? "").trim();
      const fullName = String(form.get("fullName") ?? "").trim();
      const confirmPassword = String(form.get("confirmPassword") ?? "");

      if (password !== confirmPassword) {
        setError("كلمتا المرور غير متطابقتين");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mosqueName, fullName, email, password })
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "تعذر إنشاء الحساب");
          setLoading(false);
          return;
        }

        router.push("/admin");
        router.refresh();
        return;
      } catch {
        setError("حدث خطأ غير متوقع");
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "تعذر تسجيل الدخول");
        setLoading(false);
        return;
      }

      const destination =
        nextPath ??
        (data.user.role === "ADMIN" ? "/admin" : data.user.role === "TEACHER" ? "/teacher" : "/");
      router.push(destination);
      router.refresh();
    } catch {
      setError("حدث خطأ غير متوقع");
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {!isLogin ? (
        <>
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-ink/80">اسم المسجد</span>
            <input
              className="tap-target rounded-lg border border-ink/15 bg-white px-3"
              name="mosqueName"
              required
              minLength={2}
              placeholder="مسجد النور"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-ink/80">الاسم الكامل</span>
            <input
              className="tap-target rounded-lg border border-ink/15 bg-white px-3"
              name="fullName"
              required
              minLength={2}
              placeholder="مشرف النظام"
            />
          </label>
        </>
      ) : null}

      <label className="grid gap-1">
        <span className="text-sm font-semibold text-ink/80">البريد الإلكتروني</span>
        <input
          className="tap-target rounded-lg border border-ink/15 bg-white px-3"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@example.com"
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-semibold text-ink/80">كلمة المرور</span>
        <input
          className="tap-target rounded-lg border border-ink/15 bg-white px-3"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={isLogin ? "current-password" : "new-password"}
        />
      </label>

      {!isLogin ? (
        <label className="grid gap-1">
          <span className="text-sm font-semibold text-ink/80">تأكيد كلمة المرور</span>
          <input
            className="tap-target rounded-lg border border-ink/15 bg-white px-3"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
      ) : null}

      {error ? <p className="rounded-lg bg-clay/10 px-3 py-2 text-sm font-semibold text-clay">{error}</p> : null}

      <button
        className="tap-target rounded-lg bg-teal px-5 py-3 font-bold text-white shadow-sm disabled:opacity-60"
        type="submit"
        disabled={loading}
      >
        {loading ? "جاري المعالجة..." : isLogin ? "تسجيل الدخول" : "إنشاء حساب مسجد"}
      </button>

      <p className="text-center text-sm text-ink/70">
        {isLogin ? (
          <>
            ليس لديك حساب؟{" "}
            <Link className="font-bold text-teal" href="/register">
              سجّل مسجدك
            </Link>
          </>
        ) : (
          <>
            لديك حساب بالفعل؟{" "}
            <Link className="font-bold text-teal" href="/login">
              تسجيل الدخول
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
