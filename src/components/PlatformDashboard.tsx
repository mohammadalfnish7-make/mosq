"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlatformBootstrap } from "@/types/platform-bootstrap";

function FormError({ message }: { message: string }) {
  return <p className="rounded-lg bg-clay/10 px-3 py-2 text-sm font-semibold text-clay">{message}</p>;
}

function FormSuccess({ message }: { message: string }) {
  return <p className="rounded-lg bg-mint px-3 py-2 text-sm font-semibold text-ink">{message}</p>;
}

const fieldClass = "tap-target rounded-lg border border-ink/15 bg-white px-3";
const labelClass = "text-sm font-semibold text-ink/80";
const buttonClass =
  "tap-target rounded-lg bg-teal px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-60";
const ghostButtonClass =
  "tap-target rounded-lg border border-ink/15 bg-white px-3 py-1 text-xs font-bold text-ink";

async function requestJson(method: string, url: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "تعذر تنفيذ العملية");
  }
  return data;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SY", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function TenantStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-bold ${
        isActive ? "bg-mint text-ink" : "bg-clay/15 text-clay"
      }`}
    >
      {isActive ? "نشط" : "موقوف"}
    </span>
  );
}

function CreateTenantPanel({ onCreated }: { onCreated: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const form = new FormData(event.currentTarget);
    const mosqueName = String(form.get("mosqueName") ?? "").trim();
    const fullName = String(form.get("fullName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);
    try {
      await requestJson("POST", "/api/platform/tenants", {
        mosqueName,
        fullName,
        email,
        password
      });
      setSuccess("تم إنشاء المسجد وحساب المشرف بنجاح");
      event.currentTarget.reset();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">إضافة مسجد جديد</h2>
          <p className="mt-1 text-sm text-ink/70">أنشئ مسجداً جديداً مع حساب مشرف له.</p>
        </div>
        <button
          className={ghostButtonClass}
          type="button"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "إخفاء" : "فتح النموذج"}
        </button>
      </div>

      {open ? (
        <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
          <label className="grid gap-1">
            <span className={labelClass}>اسم المسجد</span>
            <input className={fieldClass} name="mosqueName" required minLength={2} />
          </label>
          <label className="grid gap-1">
            <span className={labelClass}>اسم المشرف</span>
            <input className={fieldClass} name="fullName" required minLength={2} />
          </label>
          <label className="grid gap-1">
            <span className={labelClass}>البريد الإلكتروني للمشرف</span>
            <input className={fieldClass} name="email" type="email" required autoComplete="off" />
          </label>
          <label className="grid gap-1">
            <span className={labelClass}>كلمة المرور</span>
            <input
              className={fieldClass}
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <label className="grid gap-1">
            <span className={labelClass}>تأكيد كلمة المرور</span>
            <input
              className={fieldClass}
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          {error ? <FormError message={error} /> : null}
          {success ? <FormSuccess message={success} /> : null}

          <button className={buttonClass} type="submit" disabled={loading}>
            {loading ? "جاري الإنشاء..." : "إنشاء المسجد"}
          </button>
        </form>
      ) : null}
    </section>
  );
}

export function PlatformDashboard({ data }: { data: PlatformBootstrap }) {
  const router = useRouter();
  const [tenants, setTenants] = useState(data.tenants);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refreshTenants() {
    const next = await requestJson("GET", "/api/platform/tenants");
    setTenants(next.tenants);
    router.refresh();
  }

  async function toggleTenantStatus(tenantId: string, isActive: boolean) {
    setError(null);
    setBusyId(tenantId);
    try {
      const updated = await requestJson("PATCH", `/api/platform/tenants/${tenantId}`, { isActive });
      setTenants((current) =>
        current.map((tenant) =>
          tenant.id === tenantId ? { ...tenant, isActive: updated.isActive } : tenant
        )
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحديث حالة المسجد");
    } finally {
      setBusyId(null);
    }
  }

  async function removeTenant(tenantId: string, mosqueName: string) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف "${mosqueName}" نهائياً؟ سيتم حذف كل بياناته.`
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    setBusyId(tenantId);
    try {
      await requestJson("DELETE", `/api/platform/tenants/${tenantId}`);
      setTenants((current) => current.filter((tenant) => tenant.id !== tenantId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حذف المسجد");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <CreateTenantPanel onCreated={refreshTenants} />

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">المساجد المسجلة</h2>
            <p className="mt-1 text-sm text-ink/70">إجمالي {tenants.length} مسجد</p>
          </div>
        </div>

        {error ? <FormError message={error} /> : null}

        {tenants.length === 0 ? (
          <p className="text-sm text-ink/70">لا توجد مساجد مسجلة بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-right text-ink/60">
                  <th className="px-2 py-2 font-semibold">المسجد</th>
                  <th className="px-2 py-2 font-semibold">المشرف</th>
                  <th className="px-2 py-2 font-semibold">الإحصائيات</th>
                  <th className="px-2 py-2 font-semibold">الحالة</th>
                  <th className="px-2 py-2 font-semibold">التاريخ</th>
                  <th className="px-2 py-2 font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-ink/5 align-top">
                    <td className="px-2 py-3 font-bold text-ink">{tenant.name}</td>
                    <td className="px-2 py-3">
                      <p>{tenant.adminName ?? "—"}</p>
                      <p className="text-xs text-ink/60">{tenant.adminEmail ?? "—"}</p>
                    </td>
                    <td className="px-2 py-3 text-ink/80">
                      {tenant.userCount} مستخدم · {tenant.circleCount} حلقة · {tenant.studentCount}{" "}
                      طالب
                    </td>
                    <td className="px-2 py-3">
                      <TenantStatusBadge isActive={tenant.isActive} />
                    </td>
                    <td className="px-2 py-3 text-ink/70">{formatDate(tenant.createdAt)}</td>
                    <td className="px-2 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={ghostButtonClass}
                          type="button"
                          disabled={busyId === tenant.id}
                          onClick={() => toggleTenantStatus(tenant.id, !tenant.isActive)}
                        >
                          {tenant.isActive ? "إيقاف" : "تفعيل"}
                        </button>
                        <button
                          className="tap-target rounded-lg border border-clay/20 bg-clay/10 px-3 py-1 text-xs font-bold text-clay disabled:opacity-60"
                          type="button"
                          disabled={busyId === tenant.id}
                          onClick={() => removeTenant(tenant.id, tenant.name)}
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
