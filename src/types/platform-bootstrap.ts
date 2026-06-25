export type PlatformTenantSummary = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  adminEmail: string | null;
  adminName: string | null;
  userCount: number;
  circleCount: number;
  studentCount: number;
};

export type PlatformBootstrap = {
  tenants: PlatformTenantSummary[];
};
