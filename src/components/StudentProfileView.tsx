"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { STUDENT_APPROVAL_LABELS } from "@/lib/student-approval";
import { SURAH_STATUS_LABELS } from "@/lib/surahs";
import type { StudentProfile } from "@/types/student-profile";

const STATUS_STYLES: Record<string, string> = {
  NOT_STARTED: "bg-paper text-ink/60",
  IN_PROGRESS: "bg-amber-50 text-amber-900",
  MEMORIZED: "bg-mint text-ink",
  NEEDS_REVISION: "bg-clay/10 text-clay"
};

type StudentProfileViewProps = {
  profile: StudentProfile;
  backHref?: string;
  backLabel?: string;
  viewer: "admin" | "teacher" | "guardian";
  studentId?: string;
};

export function StudentProfileView({
  profile,
  backHref,
  backLabel = "رجوع",
  viewer,
  studentId
}: StudentProfileViewProps) {
  const [shareUrl, setShareUrl] = useState(profile.guardianShareUrl);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [regenerating, setRegenerating] = useState(false);

  const memorizationHistoryBySurah = useMemo(() => {
    const grouped = new Map<number, StudentProfile["memorization"]["evaluations"]>();
    for (const row of profile.memorization.evaluations) {
      const list = grouped.get(row.surahNumber) ?? [];
      list.push(row);
      grouped.set(row.surahNumber, list);
    }
    return grouped;
  }, [profile.memorization.evaluations]);

  async function copyShareLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
    }
  }

  async function regenerateLink() {
    if (!studentId || viewer !== "admin") return;
    setRegenerating(true);
    try {
      const response = await fetch(`/api/admin/students/${studentId}/share-token`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setShareUrl(data.guardianShareUrl);
      setCopyStatus("idle");
    } catch {
      setCopyStatus("error");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-3 py-4 sm:px-5">
      <header className="mb-4 space-y-3">
        {backHref ? (
          <Link href={backHref} className="tap-target inline-flex items-center text-sm font-bold text-teal">
            ← {backLabel}
          </Link>
        ) : null}

        <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-teal">
            {viewer === "guardian" ? "متابعة الطالب" : "ملف الطالب"}
          </p>
          <h1 className="mt-1 text-2xl font-bold">{profile.student.fullName}</h1>
          <p className="mt-1 text-sm text-ink/70">
            {profile.circle.name}
            {profile.circle.gradeLabel ? ` · ${profile.circle.gradeLabel}` : ""}
          </p>

          {viewer !== "guardian" ? (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-paper px-2 py-0.5 font-bold">
                {STUDENT_APPROVAL_LABELS[profile.student.approvalStatus]}
              </span>
              <span className="rounded-md bg-paper px-2 py-0.5 font-bold">
                {profile.student.isActive ? "نشط" : "موقوف"}
              </span>
            </div>
          ) : null}

          {profile.student.guardianPhone ? (
            <p className="mt-2 text-sm text-ink/60">ولي الأمر: {profile.student.guardianPhone}</p>
          ) : null}
        </div>

        {profile.currentSurah ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold text-amber-900">السورة الحالية</p>
            <p className="text-lg font-bold">
              {profile.currentSurah.number}. {profile.currentSurah.nameAr}
            </p>
            <p className="text-sm text-amber-800">{profile.currentSurah.statusLabel}</p>
          </div>
        ) : (
          <p className="rounded-lg border border-ink/10 bg-white px-4 py-3 text-sm text-ink/60">
            لم تُحدَّد سورة حالية بعد
          </p>
        )}
      </header>

      {shareUrl && viewer !== "guardian" ? (
        <section className="mb-4 rounded-lg border border-teal/20 bg-mint/40 p-4">
          <p className="text-sm font-bold text-ink">رابط متابعة ولي الأمر</p>
          <p className="mt-1 break-all text-xs text-ink/70">{shareUrl}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="tap-target rounded-lg bg-teal px-4 py-2 text-sm font-bold text-white"
              onClick={() => void copyShareLink()}
            >
              {copyStatus === "copied" ? "تم النسخ" : "نسخ الرابط"}
            </button>
            {viewer === "admin" && studentId ? (
              <button
                type="button"
                className="tap-target rounded-lg border border-ink/15 bg-white px-4 py-2 text-sm font-bold text-ink disabled:opacity-60"
                disabled={regenerating}
                onClick={() => void regenerateLink()}
              >
                {regenerating ? "جار التجديد..." : "تجديد الرابط"}
              </button>
            ) : null}
          </div>
          {copyStatus === "error" ? (
            <p className="mt-2 text-xs font-semibold text-clay">تعذر النسخ — انسخ الرابط يدوياً</p>
          ) : null}
        </section>
      ) : null}

      <section className="mb-4 rounded-lg border border-ink/10 bg-white p-4">
        <h2 className="text-lg font-bold">الحفظ</h2>
        <p className="mt-1 text-xs text-ink/60">
          محفوظ: {profile.memorization.summary.memorized} · قيد الحفظ:{" "}
          {profile.memorization.summary.inProgress} · مراجعة: {profile.memorization.summary.needsRevision}
        </p>
        {profile.memorization.items.length === 0 &&
        profile.memorization.evaluations.length === 0 ? (
          <p className="mt-3 text-sm text-ink/60">لا يوجد تقدم مسجّل بعد</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {profile.memorization.items.map((item) => {
              const history = memorizationHistoryBySurah.get(item.number) ?? [];
              return (
                <li
                  key={item.number}
                  className={`rounded-lg px-3 py-2 text-sm ${STATUS_STYLES[item.status] ?? "bg-paper"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">
                      {item.number}. {item.nameAr}
                    </span>
                    <span className="text-xs font-bold">{SURAH_STATUS_LABELS[item.status]}</span>
                  </div>
                  {history.length > 0 ? (
                    <ul className="mt-2 space-y-1 border-t border-ink/10 pt-2">
                      {history.map((row) => (
                        <li
                          key={`${row.evaluatedAt}-${row.sessionDate}-${row.periodLabel}`}
                          className="flex items-center justify-between gap-2 text-xs text-ink/70"
                        >
                          <span>
                            {row.sessionDate} · {row.periodLabel}
                          </span>
                          <span className="font-bold text-teal">{row.valueLabel}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mb-4 rounded-lg border border-ink/10 bg-white p-4">
        <h2 className="text-lg font-bold">سجل الحضور</h2>
        {profile.attendance.length === 0 ? (
          <p className="mt-3 text-sm text-ink/60">لا يوجد حضور مسجّل بعد</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {profile.attendance.map((row, index) => (
              <li
                key={`${row.sessionDate}-${row.periodCode}-${index}`}
                className="flex items-center justify-between gap-2 rounded-lg bg-paper px-3 py-2 text-sm"
              >
                <span>
                  {row.sessionDate} · {row.periodLabel}
                </span>
                <span className="font-bold text-teal">{row.statusLabel}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8 rounded-lg border border-ink/10 bg-white p-4">
        <h2 className="text-lg font-bold">سجل التقييمات</h2>
        {profile.evaluations.length === 0 ? (
          <p className="mt-3 text-sm text-ink/60">لا يوجد تقييم مسجّل بعد</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {profile.evaluations.map((row, index) => (
              <li
                key={`${row.sessionDate}-${row.criterionLabel}-${index}`}
                className="rounded-lg bg-paper px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{row.criterionLabel}</span>
                  <span className="font-bold text-teal">{row.valueLabel}</span>
                </div>
                <p className="mt-1 text-xs text-ink/60">
                  {row.sessionDate} · {row.periodLabel}
                  {row.surahName ? ` · ${row.surahName}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
