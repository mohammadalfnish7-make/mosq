export const PLATFORM_TENANT_ID = "00000000-0000-0000-0000-000000000000";

export function isPlatformTenant(tenantId: string) {
  return tenantId === PLATFORM_TENANT_ID;
}
