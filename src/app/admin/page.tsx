import { listAdminBootstrap } from "@/server/admin";

export default async function AdminPage() {
  const data = await listAdminBootstrap();

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6">
      <header className="mb-6">
        <p className="text-sm font-bold text-teal">لوحة الإدارة</p>
        <h1 className="mt-1 text-2xl font-bold">إعداد الحلقات والمعايير</h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-ink/10 bg-white p-4">
          <h2 className="text-lg font-bold">الحلقات</h2>
          <form className="mt-3 grid gap-2" action="/api/admin/circles" method="post">
            <input className="tap-target rounded-lg border border-ink/15 px-3" name="name" placeholder="اسم الحلقة" />
            <p className="text-xs text-ink/60">
              استخدم الـ API مباشرة لإضافة البيانات بصيغة JSON. هذه الصفحة تعرض الحالة الحالية.
            </p>
          </form>
          <div className="mt-4 space-y-2">
            {data.circles.map((circle) => (
              <div key={circle.id} className="rounded-md bg-paper px-3 py-2 font-semibold">
                {circle.name}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-ink/10 bg-white p-4">
          <h2 className="text-lg font-bold">المعلمون</h2>
          <div className="mt-4 space-y-2">
            {data.teachers.map((teacher) => (
              <div key={teacher.id} className="rounded-md bg-paper px-3 py-2 font-semibold">
                {teacher.fullName}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-ink/10 bg-white p-4">
          <h2 className="text-lg font-bold">الطلاب</h2>
          <div className="mt-4 space-y-2">
            {data.students.map((student) => {
              const circle = data.circles.find((item) => item.id === student.circleId);
              return (
                <div key={student.id} className="rounded-md bg-paper px-3 py-2">
                  <p className="font-semibold">{student.fullName}</p>
                  <p className="text-xs text-ink/60">{circle?.name ?? "حلقة غير معروفة"}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-ink/10 bg-white p-4 lg:col-span-2">
          <h2 className="text-lg font-bold">معايير التقييم الديناميكية</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {data.criteria.map((criterion) => (
              <article key={criterion.id} className="rounded-lg border border-ink/10 bg-paper p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{criterion.label}</h3>
                    <p className="text-xs text-ink/60">
                      {criterion.code} · {criterion.inputType}
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
                  <p className="mt-3 text-sm text-ink/60">عداد رقمي بدون خيارات.</p>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
