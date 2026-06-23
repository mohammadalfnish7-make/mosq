import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth-service";
import { jsonError } from "@/server/http";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}
