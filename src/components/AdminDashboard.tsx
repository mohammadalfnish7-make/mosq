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

  return { error, success, loading, submit };
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
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

function CircleSection({ circles, onSaved }: { circles: AdminBootstrap["circles"]; onSaved: () => void }) {
  const form = useAdminForm(onSaved);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const htmlForm = event.currentTarget;
    const data = new FormData(htmlForm);
    const name = String(data.get("name") ?? "").trim();
    await form.submit(async () => {
      await requestJson("POST", "/api/admin/circles", { name });
      htmlForm.reset();
      setEditingId(null);
    }, "تمت إضافة الحلقة بنجاح");
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const isActive = data.get("isActive") === "on";
    await form.submit(async () => {
      await requestJson("PATCH", `/api/admin/circles/${id}`, { name, isActive });
      setEditingId(null);
    }, "تم تحديث الحلقة");
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4">
      <h2 className="text-lg font-bold">الحلقات</h2>
      <form className="mt-3 grid gap-2" onSubmit={handleCreate}>
        <label className="grid gap-1">
          <span className={labelClass}>اسم الحلقة</span>
          <input className={fieldClass} name="name" required minLength={2} maxLength={80} placeholder="حلقة الفجر" />
        </label>
        {form.error ? <FormError message={form.error} /> : null}
        {form.success ? <FormSuccess message={form.success} /> : null}
        <button className={buttonClass} type="submit" disabled={form.loading}>
          {form.loading ? "جاري الحفظ..." : "إضافة حلقة"}
        </button>
      </form>
      <div className="mt-4 space-y-2">
        {circles.map((circle) => (
          <div key={circle.id} className="rounded-md border border-ink/10 bg-paper p-3">
            {editingId === circle.id ? (
              <form className="grid gap-2" onSubmit={(event) => void handleUpdate(event, circle.id)}>
                <input className={fieldClass} name="name" defaultValue={circle.name} required minLength={2} maxLength={80} />
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" name="isActive" defaultChecked={circle.isActive} />
                  نشط
                </label>
                <div className="flex gap-2">
                  <button className={buttonClass} type="submit" disabled={form.loading}>حفظ</button>
                  <button className={ghostButtonClass} type="button" onClick={() => setEditingId(null)}>إلغاء</button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{circle.name}</span>
                  <ActiveBadge isActive={circle.isActive} />
                </div>
                <button className={ghostButtonClass} type="button" onClick={() => setEditingId(circle.id)}>تعديل</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function TeacherSection({
  circles,
  teachers,
  onSaved
}: {
  circles: AdminBootstrap["circles"];
  teachers: AdminBootstrap["teachers"];
  onSaved: () => void;
}) {
  const form = useAdminForm(onSaved);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const htmlForm = event.currentTarget;
    const data = new FormData(htmlForm);
    await form.submit(async () => {
      await requestJson("POST", "/api/admin/teachers", {
        fullName: String(data.get("fullName") ?? "").trim(),
        email: String(data.get("email") ?? "").trim(),
        password: String(data.get("password") ?? ""),
        ...(String(data.get("phone") ?? "").trim() ? { phone: String(data.get("phone")).trim() } : {}),
        ...(String(data.get("circleId") ?? "") ? { circleId: String(data.get("circleId")) } : {})
      });
      htmlForm.reset();
    }, "تمت إضافة المعلم بنجاح");
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, teacher: AdminBootstrap["teachers"][number]) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    await form.submit(async () => {
      await requestJson("PATCH", `/api/admin/teachers/${teacher.id}`, {
        fullName: String(data.get("fullName") ?? "").trim(),
        email: String(data.get("email") ?? "").trim(),
        phone: String(data.get("phone") ?? "").trim() || null,
        circleId: String(data.get("circleId") ?? "") || null,
        isActive: data.get("isActive") === "on",
        ...(password ? { password } : {})
      });
      setEditingId(null);
    }, "تم تحديث المعلم");
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4">
      <h2 className="text-lg font-bold">المعلمون</h2>
      <form className="mt-3 grid gap-2" onSubmit={handleCreate}>
        <label className="grid gap-1"><span className={labelClass}>الاسم الكامل</span><input className={fieldClass} name="fullName" required minLength={2} maxLength={120} /></label>
        <label className="grid gap-1"><span className={labelClass}>البريد الإلكتروني</span><input className={fieldClass} name="email" type="email" required /></label>
        <label className="grid gap-1"><span className={labelClass}>كلمة المرور</span><input className={fieldClass} name="password" type="password" required minLength={8} /></label>
        <label className="grid gap-1"><span className={labelClass}>الهاتف (اختياري)</span><input className={fieldClass} name="phone" maxLength={30} /></label>
        <label className="grid gap-1">
          <span className={labelClass}>الحلقة (اختياري)</span>
          <select className={fieldClass} name="circleId" defaultValue="">
            <option value="">بدون إسناد الآن</option>
            {circles.filter((c) => c.isActive).map((circle) => (
              <option key={circle.id} value={circle.id}>{circle.name}</option>
            ))}
          </select>
        </label>
        {form.error ? <FormError message={form.error} /> : null}
        {form.success ? <FormSuccess message={form.success} /> : null}
        <button className={buttonClass} type="submit" disabled={form.loading}>{form.loading ? "جاري الحفظ..." : "إضافة معلم"}</button>
      </form>
      <div className="mt-4 space-y-2">
        {teachers.map((teacher) => {
          const circle = circles.find((item) => item.id === teacher.circleId);
          return (
            <div key={teacher.id} className="rounded-md border border-ink/10 bg-paper p-3">
              {editingId === teacher.id ? (
                <form className="grid gap-2" onSubmit={(event) => void handleUpdate(event, teacher)}>
                  <input className={fieldClass} name="fullName" defaultValue={teacher.fullName} required />
                  <input className={fieldClass} name="email" type="email" defaultValue={teacher.email} required />
                  <input className={fieldClass} name="phone" defaultValue={teacher.phone ?? ""} />
                  <input className={fieldClass} name="password" type="password" minLength={8} placeholder="كلمة مرور جديدة (اختياري)" />
                  <select className={fieldClass} name="circleId" defaultValue={teacher.circleId ?? ""}>
                    <option value="">بدون حلقة</option>
                    {circles.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" name="isActive" defaultChecked={teacher.isActive} />نشط
                  </label>
                  <div className="flex gap-2">
                    <button className={buttonClass} type="submit" disabled={form.loading}>حفظ</button>
                    <button className={ghostButtonClass} type="button" onClick={() => setEditingId(null)}>إلغاء</button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{teacher.fullName}</p>
                    <p className="text-xs text-ink/60">{teacher.email}</p>
                    <p className="text-xs text-ink/60">{circle?.name ?? "بدون حلقة"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <ActiveBadge isActive={teacher.isActive} />
                    <button className={ghostButtonClass} type="button" onClick={() => setEditingId(teacher.id)}>تعديل</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StudentSection({
  circles,
  students,
  onSaved
}: {
  circles: AdminBootstrap["circles"];
  students: AdminBootstrap["students"];
  onSaved: () => void;
}) {
  const form = useAdminForm(onSaved);
  const [editingId, setEditingId] = useState<string | null>(null);
  const activeCircles = circles.filter((circle) => circle.isActive);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const htmlForm = event.currentTarget;
    const data = new FormData(htmlForm);
    await form.submit(async () => {
      await requestJson("POST", "/api/admin/students", {
        fullName: String(data.get("fullName") ?? "").trim(),
        circleId: String(data.get("circleId") ?? ""),
        ...(String(data.get("guardianPhone") ?? "").trim() ? { guardianPhone: String(data.get("guardianPhone")).trim() } : {})
      });
      htmlForm.reset();
    }, "تمت إضافة الطالب بنجاح");
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await form.submit(async () => {
      await requestJson("PATCH", `/api/admin/students/${id}`, {
        fullName: String(data.get("fullName") ?? "").trim(),
        circleId: String(data.get("circleId") ?? ""),
        guardianPhone: String(data.get("guardianPhone") ?? "").trim() || undefined,
        isActive: data.get("isActive") === "on"
      });
      setEditingId(null);
    }, "تم تحديث الطالب");
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4">
      <h2 className="text-lg font-bold">الطلاب</h2>
      <form className="mt-3 grid gap-2" onSubmit={handleCreate}>
        <label className="grid gap-1"><span className={labelClass}>الاسم الكامل</span><input className={fieldClass} name="fullName" required minLength={2} maxLength={120} /></label>
        <label className="grid gap-1">
          <span className={labelClass}>الحلقة</span>
          <select className={fieldClass} name="circleId" required disabled={activeCircles.length === 0}>
            <option value="">{activeCircles.length ? "اختر الحلقة" : "أضف حلقة أولاً"}</option>
            {activeCircles.map((circle) => <option key={circle.id} value={circle.id}>{circle.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1"><span className={labelClass}>هاتف ولي الأمر (اختياري)</span><input className={fieldClass} name="guardianPhone" maxLength={30} /></label>
        {form.error ? <FormError message={form.error} /> : null}
        {form.success ? <FormSuccess message={form.success} /> : null}
        <button className={buttonClass} type="submit" disabled={form.loading || activeCircles.length === 0}>{form.loading ? "جاري الحفظ..." : "إضافة طالب"}</button>
      </form>
      <div className="mt-4 space-y-2">
        {students.map((student) => {
          const circle = circles.find((item) => item.id === student.circleId);
          return (
            <div key={student.id} className="rounded-md border border-ink/10 bg-paper p-3">
              {editingId === student.id ? (
                <form className="grid gap-2" onSubmit={(event) => void handleUpdate(event, student.id)}>
                  <input className={fieldClass} name="fullName" defaultValue={student.fullName} required />
                  <select className={fieldClass} name="circleId" defaultValue={student.circleId} required>
                    {circles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <input className={fieldClass} name="guardianPhone" defaultValue={student.guardianPhone ?? ""} />
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" name="isActive" defaultChecked={student.isActive} />نشط
                  </label>
                  <div className="flex gap-2">
                    <button className={buttonClass} type="submit" disabled={form.loading}>حفظ</button>
                    <button className={ghostButtonClass} type="button" onClick={() => setEditingId(null)}>إلغاء</button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{student.fullName}</p>
                    <p className="text-xs text-ink/60">{circle?.name ?? "حلقة غير معروفة"}</p>
                    {student.guardianPhone ? <p className="text-xs text-ink/60">{student.guardianPhone}</p> : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <ActiveBadge isActive={student.isActive} />
                    <button className={ghostButtonClass} type="button" onClick={() => setEditingId(student.id)}>تعديل</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CriteriaSection({ criteria, onSaved }: { criteria: AdminBootstrap["criteria"]; onSaved: () => void }) {
  const criterionForm = useAdminForm(onSaved);
  const optionForm = useAdminForm(onSaved);
  const [editingCriterionId, setEditingCriterionId] = useState<string | null>(null);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const optionCriteria = criteria.filter((criterion) => criterion.inputType === "OPTIONS");

  async function handleCriterionCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const htmlForm = event.currentTarget;
    const data = new FormData(htmlForm);
    await criterionForm.submit(async () => {
      await requestJson("POST", "/api/admin/criteria", {
        code: String(data.get("code") ?? "").trim(),
        label: String(data.get("label") ?? "").trim(),
        inputType: String(data.get("inputType") ?? "OPTIONS"),
        displayOrder: Number(data.get("displayOrder") ?? 0)
      });
      htmlForm.reset();
    }, "تمت إضافة المعيار بنجاح");
  }

  async function handleCriterionUpdate(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await criterionForm.submit(async () => {
      await requestJson("PATCH", `/api/admin/criteria/${id}`, {
        label: String(data.get("label") ?? "").trim(),
        displayOrder: Number(data.get("displayOrder") ?? 0),
        isActive: data.get("isActive") === "on"
      });
      setEditingCriterionId(null);
    }, "تم تحديث المعيار");
  }

  async function handleOptionCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const htmlForm = event.currentTarget;
    const data = new FormData(htmlForm);
    const scoreRaw = String(data.get("score") ?? "").trim();
    await optionForm.submit(async () => {
      await requestJson("POST", "/api/admin/options", {
        criterionId: String(data.get("criterionId") ?? ""),
        label: String(data.get("label") ?? "").trim(),
        value: String(data.get("value") ?? "").trim(),
        displayOrder: Number(data.get("displayOrder") ?? 0),
        ...(scoreRaw ? { score: Number(scoreRaw) } : {})
      });
      htmlForm.reset();
    }, "تمت إضافة الخيار بنجاح");
  }

  async function handleOptionUpdate(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const scoreRaw = String(data.get("score") ?? "").trim();
    await optionForm.submit(async () => {
      await requestJson("PATCH", `/api/admin/options/${id}`, {
        label: String(data.get("label") ?? "").trim(),
        displayOrder: Number(data.get("displayOrder") ?? 0),
        isActive: data.get("isActive") === "on",
        score: scoreRaw ? Number(scoreRaw) : null
      });
      setEditingOptionId(null);
    }, "تم تحديث الخيار");
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4">
      <h2 className="text-lg font-bold">معايير التقييم</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <form className="grid gap-2 rounded-lg border border-ink/10 bg-paper p-3" onSubmit={handleCriterionCreate}>
          <h3 className="font-bold">إضافة معيار</h3>
          <input className={fieldClass} name="code" required minLength={2} pattern="[a-z0-9_]+" placeholder="memorization" />
          <input className={fieldClass} name="label" required minLength={2} placeholder="الحفظ" />
          <select className={fieldClass} name="inputType" defaultValue="OPTIONS">
            <option value="OPTIONS">خيارات</option>
            <option value="COUNTER">عداد رقمي</option>
          </select>
          <input className={fieldClass} name="displayOrder" type="number" min={0} max={999} defaultValue={0} />
          <button className={buttonClass} type="submit" disabled={criterionForm.loading}>إضافة معيار</button>
          {criterionForm.error ? <FormError message={criterionForm.error} /> : null}
          {criterionForm.success ? <FormSuccess message={criterionForm.success} /> : null}
        </form>
        <form className="grid gap-2 rounded-lg border border-ink/10 bg-paper p-3" onSubmit={handleOptionCreate}>
          <h3 className="font-bold">إضافة خيار</h3>
          <select className={fieldClass} name="criterionId" required disabled={optionCriteria.length === 0} defaultValue="">
            <option value="">{optionCriteria.length ? "اختر المعيار" : "أضف معيار خيارات أولاً"}</option>
            {optionCriteria.map((criterion) => <option key={criterion.id} value={criterion.id}>{criterion.label}</option>)}
          </select>
          <input className={fieldClass} name="label" required placeholder="ممتاز" />
          <input className={fieldClass} name="value" required pattern="[a-z0-9_]+" placeholder="excellent" />
          <input className={fieldClass} name="score" type="number" min={-999} max={999} />
          <input className={fieldClass} name="displayOrder" type="number" min={0} max={999} defaultValue={0} />
          <button className={buttonClass} type="submit" disabled={optionForm.loading || optionCriteria.length === 0}>إضافة خيار</button>
          {optionForm.error ? <FormError message={optionForm.error} /> : null}
          {optionForm.success ? <FormSuccess message={optionForm.success} /> : null}
        </form>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {criteria.map((criterion) => (
          <article key={criterion.id} className="rounded-lg border border-ink/10 bg-paper p-3">
            {editingCriterionId === criterion.id ? (
              <form className="grid gap-2" onSubmit={(event) => void handleCriterionUpdate(event, criterion.id)}>
                <p className="text-xs text-ink/60">{criterion.code} · {criterion.inputType}</p>
                <input className={fieldClass} name="label" defaultValue={criterion.label} required />
                <input className={fieldClass} name="displayOrder" type="number" defaultValue={criterion.displayOrder} />
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" name="isActive" defaultChecked={criterion.isActive} />نشط
                </label>
                <div className="flex gap-2">
                  <button className={buttonClass} type="submit" disabled={criterionForm.loading}>حفظ</button>
                  <button className={ghostButtonClass} type="button" onClick={() => setEditingCriterionId(null)}>إلغاء</button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{criterion.label}</h3>
                    <p className="text-xs text-ink/60">{criterion.code} · {criterion.inputType === "OPTIONS" ? "خيارات" : "عداد"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <ActiveBadge isActive={criterion.isActive} />
                    <button className={ghostButtonClass} type="button" onClick={() => setEditingCriterionId(criterion.id)}>تعديل</button>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {criterion.options.map((option) => (
                    <div key={option.id} className="rounded-md bg-white p-2">
                      {editingOptionId === option.id ? (
                        <form className="grid gap-2" onSubmit={(event) => void handleOptionUpdate(event, option.id)}>
                          <input className={fieldClass} name="label" defaultValue={option.label} required />
                          <input className={fieldClass} name="score" type="number" defaultValue={option.score ?? ""} />
                          <input className={fieldClass} name="displayOrder" type="number" defaultValue={option.displayOrder} />
                          <label className="flex items-center gap-2 text-sm font-semibold">
                            <input type="checkbox" name="isActive" defaultChecked={option.isActive} />نشط
                          </label>
                          <div className="flex gap-2">
                            <button className={buttonClass} type="submit" disabled={optionForm.loading}>حفظ</button>
                            <button className={ghostButtonClass} type="button" onClick={() => setEditingOptionId(null)}>إلغاء</button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{option.label} ({option.value})</span>
                          <button className={ghostButtonClass} type="button" onClick={() => setEditingOptionId(option.id)}>تعديل</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export function AdminDashboard({ data }: { data: AdminBootstrap }) {
  const router = useRouter();
  const [tab, setTab] = useState<"circles" | "teachers" | "students" | "criteria">("circles");

  function refresh() {
    router.refresh();
  }

  const tabs = [
    { id: "circles" as const, label: "الحلقات", count: data.circles.length },
    { id: "teachers" as const, label: "المعلمون", count: data.teachers.length },
    { id: "students" as const, label: "الطلاب", count: data.students.length },
    { id: "criteria" as const, label: "المعايير", count: data.criteria.length }
  ];

  return (
    <div>
      <nav className="sticky top-0 z-20 -mx-4 border-b border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-0 sm:rounded-lg sm:border sm:px-3">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold ${
                tab === item.id ? "bg-teal text-white" : "bg-white text-ink border border-ink/10"
              }`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
              <span className="mr-1 text-xs opacity-80">({item.count})</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="mt-4 max-w-3xl">
        {tab === "circles" ? <CircleSection circles={data.circles} onSaved={refresh} /> : null}
        {tab === "teachers" ? (
          <TeacherSection circles={data.circles} teachers={data.teachers} onSaved={refresh} />
        ) : null}
        {tab === "students" ? (
          <StudentSection circles={data.circles} students={data.students} onSaved={refresh} />
        ) : null}
        {tab === "criteria" ? <CriteriaSection criteria={data.criteria} onSaved={refresh} /> : null}
      </div>
    </div>
  );
}
