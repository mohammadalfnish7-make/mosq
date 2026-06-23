"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminBootstrap } from "@/types/admin-bootstrap";

export type { AdminBootstrap };

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

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "تعذر حفظ البيانات");
  }
  return data;
}

function useAdminForm(onSuccess: () => void) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(action: () => Promise<void>, successMessage: string) {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await action();
      setSuccess(successMessage);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  return { error, success, loading, submit, clearMessages: () => { setError(null); setSuccess(null); } };
}

function CircleSection({ circles, onCreated }: { circles: AdminBootstrap["circles"]; onCreated: () => void }) {
  const { error, success, loading, submit } = useAdminForm(onCreated);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    await submit(async () => {
      await postJson("/api/admin/circles", { name });
      event.currentTarget.reset();
    }, "تمت إضافة الحلقة بنجاح");
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4">
      <h2 className="text-lg font-bold">الحلقات</h2>
      <form className="mt-3 grid gap-2" onSubmit={handleSubmit}>
        <label className="grid gap-1">
          <span className={labelClass}>اسم الحلقة</span>
          <input className={fieldClass} name="name" required minLength={2} maxLength={80} placeholder="حلقة الفجر" />
        </label>
        {error ? <FormError message={error} /> : null}
        {success ? <FormSuccess message={success} /> : null}
        <button className={buttonClass} type="submit" disabled={loading}>
          {loading ? "جاري الحفظ..." : "إضافة حلقة"}
        </button>
      </form>
      <div className="mt-4 space-y-2">
        {circles.length === 0 ? (
          <p className="text-sm text-ink/60">لا توجد حلقات بعد.</p>
        ) : (
          circles.map((circle) => (
            <div key={circle.id} className="rounded-md bg-paper px-3 py-2 font-semibold">
              {circle.name}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function TeacherSection({
  circles,
  teachers,
  onCreated
}: {
  circles: AdminBootstrap["circles"];
  teachers: AdminBootstrap["teachers"];
  onCreated: () => void;
}) {
  const { error, success, loading, submit } = useAdminForm(onCreated);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const phone = String(form.get("phone") ?? "").trim();
    const circleId = String(form.get("circleId") ?? "");

    await submit(async () => {
      await postJson("/api/admin/teachers", {
        fullName,
        email,
        password,
        ...(phone ? { phone } : {}),
        ...(circleId ? { circleId } : {})
      });
      event.currentTarget.reset();
    }, "تمت إضافة المعلم بنجاح");
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4">
      <h2 className="text-lg font-bold">المعلمون</h2>
      <form className="mt-3 grid gap-2" onSubmit={handleSubmit}>
        <label className="grid gap-1">
          <span className={labelClass}>الاسم الكامل</span>
          <input className={fieldClass} name="fullName" required minLength={2} maxLength={120} />
        </label>
        <label className="grid gap-1">
          <span className={labelClass}>البريد الإلكتروني</span>
          <input className={fieldClass} name="email" type="email" required />
        </label>
        <label className="grid gap-1">
          <span className={labelClass}>كلمة المرور</span>
          <input className={fieldClass} name="password" type="password" required minLength={8} />
        </label>
        <label className="grid gap-1">
          <span className={labelClass}>الهاتف (اختياري)</span>
          <input className={fieldClass} name="phone" maxLength={30} />
        </label>
        <label className="grid gap-1">
          <span className={labelClass}>الحلقة (اختياري)</span>
          <select className={fieldClass} name="circleId" defaultValue="">
            <option value="">بدون إسناد الآن</option>
            {circles.map((circle) => (
              <option key={circle.id} value={circle.id}>
                {circle.name}
              </option>
            ))}
          </select>
        </label>
        {error ? <FormError message={error} /> : null}
        {success ? <FormSuccess message={success} /> : null}
        <button className={buttonClass} type="submit" disabled={loading}>
          {loading ? "جاري الحفظ..." : "إضافة معلم"}
        </button>
      </form>
      <div className="mt-4 space-y-2">
        {teachers.length === 0 ? (
          <p className="text-sm text-ink/60">لا يوجد معلمون بعد.</p>
        ) : (
          teachers.map((teacher) => (
            <div key={teacher.id} className="rounded-md bg-paper px-3 py-2 font-semibold">
              {teacher.fullName}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function StudentSection({
  circles,
  students,
  onCreated
}: {
  circles: AdminBootstrap["circles"];
  students: AdminBootstrap["students"];
  onCreated: () => void;
}) {
  const { error, success, loading, submit } = useAdminForm(onCreated);
  const hasCircles = circles.length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const circleId = String(form.get("circleId") ?? "");
    const guardianPhone = String(form.get("guardianPhone") ?? "").trim();

    await submit(async () => {
      await postJson("/api/admin/students", {
        fullName,
        circleId,
        ...(guardianPhone ? { guardianPhone } : {})
      });
      event.currentTarget.reset();
    }, "تمت إضافة الطالب بنجاح");
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4">
      <h2 className="text-lg font-bold">الطلاب</h2>
      <form className="mt-3 grid gap-2" onSubmit={handleSubmit}>
        <label className="grid gap-1">
          <span className={labelClass}>الاسم الكامل</span>
          <input className={fieldClass} name="fullName" required minLength={2} maxLength={120} />
        </label>
        <label className="grid gap-1">
          <span className={labelClass}>الحلقة</span>
          <select className={fieldClass} name="circleId" required disabled={!hasCircles}>
            <option value="">{hasCircles ? "اختر الحلقة" : "أضف حلقة أولاً"}</option>
            {circles.map((circle) => (
              <option key={circle.id} value={circle.id}>
                {circle.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className={labelClass}>هاتف ولي الأمر (اختياري)</span>
          <input className={fieldClass} name="guardianPhone" maxLength={30} />
        </label>
        {error ? <FormError message={error} /> : null}
        {success ? <FormSuccess message={success} /> : null}
        <button className={buttonClass} type="submit" disabled={loading || !hasCircles}>
          {loading ? "جاري الحفظ..." : "إضافة طالب"}
        </button>
      </form>
      <div className="mt-4 space-y-2">
        {students.length === 0 ? (
          <p className="text-sm text-ink/60">لا يوجد طلاب بعد.</p>
        ) : (
          students.map((student) => {
            const circle = circles.find((item) => item.id === student.circleId);
            return (
              <div key={student.id} className="rounded-md bg-paper px-3 py-2">
                <p className="font-semibold">{student.fullName}</p>
                <p className="text-xs text-ink/60">{circle?.name ?? "حلقة غير معروفة"}</p>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function CriteriaSection({
  criteria,
  onCreated
}: {
  criteria: AdminBootstrap["criteria"];
  onCreated: () => void;
}) {
  const criterionForm = useAdminForm(onCreated);
  const optionForm = useAdminForm(onCreated);
  const optionCriteria = criteria.filter((criterion) => criterion.inputType === "OPTIONS");

  async function handleCriterionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").trim();
    const label = String(form.get("label") ?? "").trim();
    const inputType = String(form.get("inputType") ?? "OPTIONS");
    const displayOrder = Number(form.get("displayOrder") ?? 0);

    await criterionForm.submit(async () => {
      await postJson("/api/admin/criteria", { code, label, inputType, displayOrder });
      event.currentTarget.reset();
    }, "تمت إضافة المعيار بنجاح");
  }

  async function handleOptionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const criterionId = String(form.get("criterionId") ?? "");
    const label = String(form.get("label") ?? "").trim();
    const value = String(form.get("value") ?? "").trim();
    const scoreRaw = String(form.get("score") ?? "").trim();
    const displayOrder = Number(form.get("displayOrder") ?? 0);

    await optionForm.submit(async () => {
      await postJson("/api/admin/options", {
        criterionId,
        label,
        value,
        displayOrder,
        ...(scoreRaw ? { score: Number(scoreRaw) } : {})
      });
      event.currentTarget.reset();
    }, "تمت إضافة الخيار بنجاح");
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4 lg:col-span-2">
      <h2 className="text-lg font-bold">معايير التقييم</h2>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <form className="grid gap-2 rounded-lg border border-ink/10 bg-paper p-3" onSubmit={handleCriterionSubmit}>
          <h3 className="font-bold">إضافة معيار</h3>
          <label className="grid gap-1">
            <span className={labelClass}>الرمز (إنجليزي)</span>
            <input
              className={fieldClass}
              name="code"
              required
              minLength={2}
              maxLength={50}
              pattern="[a-z0-9_]+"
              placeholder="memorization"
            />
          </label>
          <label className="grid gap-1">
            <span className={labelClass}>العنوان</span>
            <input className={fieldClass} name="label" required minLength={2} maxLength={80} placeholder="الحفظ" />
          </label>
          <label className="grid gap-1">
            <span className={labelClass}>نوع الإدخال</span>
            <select className={fieldClass} name="inputType" defaultValue="OPTIONS">
              <option value="OPTIONS">خيارات</option>
              <option value="COUNTER">عداد رقمي</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className={labelClass}>ترتيب العرض</span>
            <input className={fieldClass} name="displayOrder" type="number" min={0} max={999} defaultValue={0} />
          </label>
          <button className={buttonClass} type="submit" disabled={criterionForm.loading}>
            {criterionForm.loading ? "جاري الحفظ..." : "إضافة معيار"}
          </button>
          {criterionForm.error ? <FormError message={criterionForm.error} /> : null}
          {criterionForm.success ? <FormSuccess message={criterionForm.success} /> : null}
        </form>

        <form className="grid gap-2 rounded-lg border border-ink/10 bg-paper p-3" onSubmit={handleOptionSubmit}>
          <h3 className="font-bold">إضافة خيار لمعيار</h3>
          <label className="grid gap-1">
            <span className={labelClass}>المعيار</span>
            <select
              className={fieldClass}
              name="criterionId"
              required
              disabled={optionCriteria.length === 0}
              defaultValue=""
            >
              <option value="">
                {optionCriteria.length === 0 ? "أضف معيار خيارات أولاً" : "اختر المعيار"}
              </option>
              {optionCriteria.map((criterion) => (
                <option key={criterion.id} value={criterion.id}>
                  {criterion.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className={labelClass}>التسمية</span>
            <input className={fieldClass} name="label" required minLength={1} maxLength={80} placeholder="ممتاز" />
          </label>
          <label className="grid gap-1">
            <span className={labelClass}>القيمة (إنجليزي)</span>
            <input
              className={fieldClass}
              name="value"
              required
              minLength={1}
              maxLength={80}
              pattern="[a-z0-9_]+"
              placeholder="excellent"
            />
          </label>
          <label className="grid gap-1">
            <span className={labelClass}>الدرجة (اختياري)</span>
            <input className={fieldClass} name="score" type="number" min={-999} max={999} />
          </label>
          <label className="grid gap-1">
            <span className={labelClass}>ترتيب العرض</span>
            <input className={fieldClass} name="displayOrder" type="number" min={0} max={999} defaultValue={0} />
          </label>
          <button className={buttonClass} type="submit" disabled={optionForm.loading || optionCriteria.length === 0}>
            {optionForm.loading ? "جاري الحفظ..." : "إضافة خيار"}
          </button>
          {optionForm.error ? <FormError message={optionForm.error} /> : null}
          {optionForm.success ? <FormSuccess message={optionForm.success} /> : null}
        </form>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {criteria.length === 0 ? (
          <p className="text-sm text-ink/60">لا توجد معايير بعد.</p>
        ) : (
          criteria.map((criterion) => (
            <article key={criterion.id} className="rounded-lg border border-ink/10 bg-paper p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold">{criterion.label}</h3>
                  <p className="text-xs text-ink/60">
                    {criterion.code} · {criterion.inputType === "OPTIONS" ? "خيارات" : "عداد"}
                  </p>
                </div>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-bold">{criterion.displayOrder}</span>
              </div>
              {criterion.options.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {criterion.options.map((option) => (
                    <span key={option.id} className="rounded-md bg-white px-2 py-1 text-sm font-semibold">
                      {option.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink/60">
                  {criterion.inputType === "COUNTER" ? "عداد رقمي بدون خيارات." : "لا توجد خيارات بعد."}
                </p>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export function AdminDashboard({ data }: { data: AdminBootstrap }) {
  const router = useRouter();

  function refresh() {
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CircleSection circles={data.circles} onCreated={refresh} />
      <TeacherSection circles={data.circles} teachers={data.teachers} onCreated={refresh} />
      <StudentSection circles={data.circles} students={data.students} onCreated={refresh} />
      <CriteriaSection criteria={data.criteria} onCreated={refresh} />
    </div>
  );
}
