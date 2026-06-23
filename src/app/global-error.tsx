"use client";

import { useEffect } from "react";

export default function GlobalError({
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
        message: "client.global_error",
        timestamp: new Date().toISOString(),
        errorMessage: error.message,
        digest: error.digest
      })
    );
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body>
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-xl font-semibold">حدث خطأ في التطبيق</h1>
          <button
            type="button"
            onClick={reset}
            className="rounded bg-black px-4 py-2 text-sm text-white"
          >
            إعادة المحاولة
          </button>
        </main>
      </body>
    </html>
  );
}
