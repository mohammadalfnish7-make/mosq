import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "متابعة الطالب",
  robots: { index: false, follow: false }
};

export default function GuardianLayout({ children }: { children: React.ReactNode }) {
  return children;
}
