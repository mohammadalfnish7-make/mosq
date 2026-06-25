import { NextRequest } from "next/server";
import { getRequestMeta } from "@/lib/request-meta";
import { createPlatformTenant, listPlatformBootstrap } from "@/server/platform";
import { registerSchema } from "@/server/auth-service";
import { jsonData, jsonError } from "@/server/http";

export async function GET() {
  try {
    return jsonData(await listPlatformBootstrap());
  } catch (error) {
    return jsonError(error, { path: "/api/platform/tenants" });
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = registerSchema.parse(await request.json());
    const tenant = await createPlatformTenant(input, getRequestMeta(request));
    return jsonData(tenant, { status: 201 });
  } catch (error) {
    return jsonError(error, { path: "/api/platform/tenants" });
  }
}
