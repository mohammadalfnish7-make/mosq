import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/base-url";
import { regenerateGuardianShareToken } from "@/server/student-profile";
import { jsonError } from "@/server/http";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(await regenerateGuardianShareToken(id, await getBaseUrl()));
  } catch (error) {
    return jsonError(error);
  }
}
