"use client";

import { useEffect, useMemo, useState } from "react";

type Student = { id: string; fullName: string };
type Option = { id: string; label: string; value: string };
type Criterion = { id: string; label: string; inputType: "OPTIONS" | "COUNTER"; options: Option[] };
type AttendanceChoice = { value: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; label: string };

type SessionPayload = {
  circle: { id: string; name: string };
  students: Student[];
  criteria: Criterion[];
  attendanceChoices: AttendanceChoice[];
  existing: {
    attendance: { studentId: string; status: AttendanceChoice["value"] }[];
    evaluations: { studentId: string; criterionId: string; optionId: string | null; counterValue: number | null }[];
  };
};

type EvaluationDraft = Record<string, Record<string, { optionId?: string; counterValue?: number }>>;
type AttendanceDraft = Record<string, AttendanceChoice["value"]>;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function TeacherSessionForm({ initialCircle }: { initialCircle: { id: string; name: string } }) {
  const [date, setDate] = useState(today());
  const [periodCode, setPeriodCode] = useState("default");
  const [payload, setPayload] = useState<SessionPayload | null>(null);
  const [attendance, setAttendance] = useState<AttendanceDraft>({});
  const [evaluations, setEvaluations] = useState<EvaluationDraft>({});
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    fetch(`/api/teacher/session-form?circleId=${initialCircle.id}&date=${date}&periodCode=${periodCode}`, {
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load form");
        return response.json() as Promise<SessionPayload>;
      })
      .then((data) => {
        const attendanceDraft: AttendanceDraft = {};
        for (const entry of data.existing.attendance) {
          attendanceDraft[entry.studentId] = entry.status;
        }

        const evaluationDraft: EvaluationDraft = {};
        for (const entry of data.existing.evaluations) {
          evaluationDraft[entry.studentId] ??= {};
          evaluationDraft[entry.studentId][entry.criterionId] = {
            ...(entry.optionId ? { optionId: entry.optionId } : {}),
            ...(entry.counterValue !== null ? { counterValue: entry.counterValue } : {})
          };
        }

        setPayload(data);
        setAttendance(attendanceDraft);
        setEvaluations(evaluationDraft);
        setStatus("idle");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setStatus("error");
      });

    return () => controller.abort();
  }, [date, initialCircle.id, periodCode]);

  const counts = useMemo(() => {
    const attendanceCount = Object.keys(attendance).length;
    const evaluationCount = Object.values(evaluations).reduce(
      (sum, studentEvaluations) => sum + Object.keys(studentEvaluations).length,
      0
    );
    return { attendanceCount, evaluationCount };
  }, [attendance, evaluations]);

  function setCriterion(studentId: string, criterion: Criterion, value: { optionId?: string; counterValue?: number }) {
    setEvaluations((current) => ({
      ...current,
      [studentId]: {
        ...(current[studentId] ?? {}),
        [criterion.id]: value
      }
    }));
  }

  async function save() {
    if (!payload) return;
    setStatus("saving");

    const body = {
      circleId: payload.circle.id,
      sessionDate: date,
      periodCode,
      attendance: Object.entries(attendance).map(([studentId, entryStatus]) => ({
        studentId,
        status: entryStatus
      })),
      evaluations: Object.entries(evaluations).flatMap(([studentId, studentEvaluations]) =>
        Object.entries(studentEvaluations).map(([criterionId, value]) => ({
          studentId,
          criterionId,
          ...value
        }))
      )
    };

    const response = await fetch("/api/teacher/sessions/bulk-save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    setStatus(response.ok ? "saved" : "error");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-3 py-4 sm:px-5">
      <header className="sticky top-0 z-10 -mx-3 border-b border-ink/10 bg-paper/95 px-3 py-3 backdrop-blur sm:-mx-5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-teal">واجهة المعلم</p>
            <h1 className="text-xl font-bold">{initialCircle.name}</h1>
          </div>
          <button
            className="tap-target rounded-lg bg-teal px-5 font-bold text-white disabled:opacity-60"
            onClick={save}
            disabled={!payload || status === "saving"}
          >
            {status === "saving" ? "جار الحفظ" : "حفظ"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <input
            className="tap-target rounded-lg border border-ink/15 bg-white px-3"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <select
            className="tap-target rounded-lg border border-ink/15 bg-white px-3"
            value={periodCode}
            onChange={(event) => setPeriodCode(event.target.value)}
            aria-label="الفترة"
          >
            <option value="default">الحصة</option>
            <option value="fajr">الفجر</option>
            <option value="asr">العصر</option>
            <option value="isha">العشاء</option>
          </select>
        </div>
        <p className="mt-2 text-xs text-ink/60">
          الحضور: {counts.attendanceCount}، التقييمات: {counts.evaluationCount}
          {status === "saved" ? "، تم الحفظ" : ""}
          {status === "error" ? "، حدث خطأ" : ""}
        </p>
      </header>

      {status === "loading" || !payload ? (
        <p className="py-8 text-center text-ink/70">جار تحميل النموذج...</p>
      ) : (
        <div className="space-y-4 py-4">
          {payload.students.map((student) => (
            <section key={student.id} className="rounded-lg border border-ink/10 bg-white p-3 shadow-sm">
              <h2 className="text-lg font-bold">{student.fullName}</h2>

              <div className="mt-3 grid grid-cols-4 gap-2">
                {payload.attendanceChoices.map((choice) => {
                  const selected = attendance[student.id] === choice.value;
                  return (
                    <button
                      key={choice.value}
                      className={`tap-target rounded-lg border px-2 text-sm font-bold ${
                        selected ? "border-teal bg-mint text-ink" : "border-ink/10 bg-paper text-ink/75"
                      }`}
                      onClick={() => setAttendance((current) => ({ ...current, [student.id]: choice.value }))}
                    >
                      {choice.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 space-y-4">
                {payload.criteria.map((criterion) => {
                  const current = evaluations[student.id]?.[criterion.id];
                  return (
                    <div key={criterion.id}>
                      <p className="mb-2 text-sm font-bold text-ink/75">{criterion.label}</p>
                      {criterion.inputType === "OPTIONS" ? (
                        <div className="grid gap-2 sm:grid-cols-3">
                          {criterion.options.map((option) => {
                            const selected = current?.optionId === option.id;
                            return (
                              <button
                                key={option.id}
                                className={`tap-target rounded-lg border px-3 font-bold ${
                                  selected ? "border-teal bg-teal text-white" : "border-ink/10 bg-paper text-ink"
                                }`}
                                onClick={() => setCriterion(student.id, criterion, { optionId: option.id })}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="grid grid-cols-[56px_1fr_56px] items-center gap-2">
                          <button
                            className="tap-target rounded-lg bg-clay font-bold text-white"
                            onClick={() =>
                              setCriterion(student.id, criterion, {
                                counterValue: Math.max((current?.counterValue ?? 0) - 1, 0)
                              })
                            }
                            aria-label="إنقاص"
                          >
                            -
                          </button>
                          <output className="tap-target rounded-lg border border-ink/10 bg-paper px-3 text-center text-xl font-bold leading-[48px]">
                            {current?.counterValue ?? 0}
                          </output>
                          <button
                            className="tap-target rounded-lg bg-teal font-bold text-white"
                            onClick={() =>
                              setCriterion(student.id, criterion, {
                                counterValue: (current?.counterValue ?? 0) + 1
                              })
                            }
                            aria-label="زيادة"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
