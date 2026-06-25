import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "التسجيل مغلق حالياً. تواصل مع إدارة المنصة." },
    { status: 403 }
  );
}
