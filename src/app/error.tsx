"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        level: "error",
        message: "client.render_error",
        timestamp: new Date().toISOString(),
        errorMessage: error.message,
        digest: error.digest
      })
    );
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">حدث خطأ غير متوقع</h1>
      <p className="text-sm text-gray-600">جرّب إعادة تحميل الصفحة.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded bg-black px-4 py-2 text-sm text-white"
      >
        إعادة المحاولة
      </button>
    </main>
  );
}
