"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      className={className ?? "tap-target rounded-lg border border-ink/15 bg-white px-4 py-2 text-sm font-bold text-ink"}
      type="button"
      onClick={handleLogout}
      disabled={loading}
    >
      {loading ? "..." : "تسجيل الخروج"}
    </button>
  );
}
