"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SURAH_STATUS_CYCLE, SURAH_STATUS_LABELS, type SurahStatusValue } from "@/lib/surahs";
import { TeacherSessionForm } from "./TeacherSessionForm";

type Student = { id: string; fullName: string };

type SurahItem = {
  number: number;
  nameAr: string;
  nameEn: string;
  ayahCount: number;
  juz: number;
  status: SurahStatusValue;
  notes: string | null;
  updatedAt: string | null;
};

type MemorizationPayload = {
  student: { id: string; fullName: string };
  summary: {
    total: number;
    memorized: number;
    inProgress: number;
    needsRevision: number;
    notStarted: number;
  };
  items: SurahItem[];
};

const STATUS_STYLES: Record<SurahStatusValue, string> = {
  NOT_STARTED: "border-ink/10 bg-paper text-ink/60",
  IN_PROGRESS: "border-amber-300 bg-amber-50 text-amber-900",
  MEMORIZED: "border-teal bg-mint text-ink",
  NEEDS_REVISION: "border-clay/40 bg-clay/10 text-clay"
};

function nextStatus(current: SurahStatusValue): SurahStatusValue {
  const index = SURAH_STATUS_CYCLE.indexOf(current);
  return SURAH_STATUS_CYCLE[(index + 1) % SURAH_STATUS_CYCLE.length];
}

function MemorizationPanel({
  circleId,
  students
}: {
  circleId: string;
  students: Student[];
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [payload, setPayload] = useState<MemorizationPayload | null>(null);
  const [juzFilter, setJuzFilter] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<SurahStatusValue | "all">("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "error">("idle");
  const [savingSurah, setSavingSurah] = useState<number | null>(null);

  const loadMap = useCallback(async () => {
    if (!studentId) return;
    setStatus("loading");
    try {
      const response = await fetch(
        `/api/teacher/memorization?studentId=${studentId}&circleId=${circleId}`
      );
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as MemorizationPayload;
      setPayload(data);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [circleId, studentId]);

  useEffect(() => {
    void loadMap();
  }, [loadMap]);

  const filteredItems = useMemo(() => {
    if (!payload) return [];
    const query = search.trim().toLowerCase();
    return payload.items.filter((item) => {
      if (juzFilter !== "all" && item.juz !== juzFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!query) return true;
      return (
        item.nameAr.includes(search.trim()) ||
        item.nameEn.toLowerCase().includes(query) ||
        String(item.number).includes(query)
      );
    });
  }, [juzFilter, payload, search, statusFilter]);

  async function updateSurahStatus(surahNumber: number, statusValue: SurahStatusValue) {
    setSavingSurah(surahNumber);
    try {
      const response = await fetch("/api/teacher/memorization", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentId,
          circleId,
          items: [{ surahNumber, status: statusValue }]
        })
      });
      if (!response.ok) throw new Error("save failed");
      const data = (await response.json()) as MemorizationPayload;
      setPayload(data);
    } catch {
      setStatus("error");
    } finally {
      setSavingSurah(null);
    }
  }

  if (students.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-5 py-8">
        <p className="text-ink/70">لا يوجد طلاب في هذه الحلقة بعد.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-3 py-4 sm:px-5">
      <header className="sticky top-0 z-10 -mx-3 border-b border-ink/10 bg-paper/95 px-3 py-3 backdrop-blur sm:-mx-5 sm:px-5">
        <p className="text-xs font-bold text-teal">متابعة الحفظ</p>
        <h1 className="text-xl font-bold">خريطة السور</h1>

        <label className="mt-3 grid gap-1">
          <span className="text-sm font-semibold text-ink/80">الطالب</span>
          <select
            className="tap-target rounded-lg border border-ink/15 bg-white px-3"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.fullName}
              </option>
            ))}
          </select>
        </label>

        {payload ? (
          <p className="mt-2 text-xs text-ink/60">
            محفوظ: {payload.summary.memorized}/{payload.summary.total} · قيد الحفظ:{" "}
            {payload.summary.inProgress} · مراجعة: {payload.summary.needsRevision}
          </p>
        ) : null}

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            className="tap-target rounded-lg border border-ink/15 bg-white px-3"
            placeholder="بحث باسم السورة أو رقمها"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="tap-target rounded-lg border border-ink/15 bg-white px-3"
            value={juzFilter === "all" ? "all" : String(juzFilter)}
            onChange={(event) => {
              const value = event.target.value;
              setJuzFilter(value === "all" ? "all" : Number(value));
            }}
          >
            <option value="all">كل الأجزاء</option>
            {Array.from({ length: 30 }, (_, index) => index + 1).map((juz) => (
              <option key={juz} value={juz}>
                الجزء {juz}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {(["all", ...SURAH_STATUS_CYCLE] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                statusFilter === value ? "bg-teal text-white" : "bg-white text-ink/70 border border-ink/10"
              }`}
              onClick={() => setStatusFilter(value === "all" ? "all" : value)}
            >
              {value === "all" ? "الكل" : SURAH_STATUS_LABELS[value]}
            </button>
          ))}
        </div>
      </header>

      {status === "loading" || !payload ? (
        <p className="py-8 text-center text-ink/70">جار تحميل خريطة الحفظ...</p>
      ) : status === "error" ? (
        <div className="py-8 text-center">
          <p className="text-clay font-semibold">تعذر تحميل البيانات</p>
          <button className="mt-3 text-sm font-bold text-teal" type="button" onClick={() => void loadMap()}>
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <div className="space-y-2 py-4">
          {filteredItems.length === 0 ? (
            <p className="text-center text-sm text-ink/60">لا توجد سور مطابقة للفلتر.</p>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.number}
                type="button"
                disabled={savingSurah === item.number}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-right transition disabled:opacity-60 ${STATUS_STYLES[item.status]}`}
                onClick={() => void updateSurahStatus(item.number, nextStatus(item.status))}
              >
                <div>
                  <p className="font-bold">
                    {item.number}. {item.nameAr}
                  </p>
                  <p className="text-xs opacity-70">
                    {item.ayahCount} آية · الجزء {item.juz}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-white/80 px-2 py-1 text-xs font-bold">
                  {SURAH_STATUS_LABELS[item.status]}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      <p className="pb-6 text-center text-xs text-ink/50">اضغط على السورة لتغيير حالتها</p>
    </main>
  );
}

type TeacherWorkspaceProps = {
  circle: { id: string; name: string };
  students: Student[];
};

export function TeacherWorkspace({ circle, students }: TeacherWorkspaceProps) {
  const [tab, setTab] = useState<"session" | "memorization">("session");

  return (
    <div>
      <div className="sticky top-0 z-20 border-b border-ink/10 bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2 px-3 py-3 sm:px-5">
          <button
            type="button"
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold ${
              tab === "session" ? "bg-teal text-white" : "bg-white text-ink border border-ink/10"
            }`}
            onClick={() => setTab("session")}
          >
            الحصة اليومية
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold ${
              tab === "memorization" ? "bg-teal text-white" : "bg-white text-ink border border-ink/10"
            }`}
            onClick={() => setTab("memorization")}
          >
            الحفظ
          </button>
        </div>
      </div>

      {tab === "session" ? (
        <TeacherSessionForm initialCircle={circle} />
      ) : (
        <MemorizationPanel circleId={circle.id} students={students} />
      )}
    </div>
  );
}
