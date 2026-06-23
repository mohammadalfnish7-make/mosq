import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { regenerateGuardianShareToken } from "@/server/student-profile";
import { jsonError } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

function getBaseUrl() {
  const headerStore = headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : undefined;
}

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(await regenerateGuardianShareToken(id, getBaseUrl()));
  } catch (error) {
    return jsonError(error);
  }
}
