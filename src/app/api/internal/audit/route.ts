import { NextRequest, NextResponse } from "next/server";
import { auditEventSchema, writeAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-audit-secret");
  if (!secret || secret !== process.env.AUDIT_INTERNAL_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const event = auditEventSchema.parse(await request.json());
    await writeAudit(event);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
