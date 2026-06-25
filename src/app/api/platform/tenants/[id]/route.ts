import { NextRequest } from "next/server";
import { getRequestMeta } from "@/lib/request-meta";
import {
  deletePlatformTenant,
  tenantStatusSchema,
  updatePlatformTenantStatus
} from "@/server/platform";
import { jsonData, jsonError } from "@/server/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const input = tenantStatusSchema.parse(await request.json());
    const tenant = await updatePlatformTenantStatus(id, input, getRequestMeta(request));
    return jsonData(tenant);
  } catch (error) {
    return jsonError(error, { path: "/api/platform/tenants/[id]" });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await deletePlatformTenant(id, getRequestMeta(_request));
    return jsonData(result);
  } catch (error) {
    return jsonError(error, { path: "/api/platform/tenants/[id]" });
  }
}
