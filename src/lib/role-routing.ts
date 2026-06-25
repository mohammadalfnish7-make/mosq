import { UserRole } from "@prisma/client";

export function homePathForRole(role: UserRole | string) {
  if (role === UserRole.PLATFORM_ADMIN) {
    return "/platform";
  }
  if (role === UserRole.ADMIN) {
    return "/admin";
  }
  if (role === UserRole.TEACHER) {
    return "/teacher";
  }
  return "/";
}

export function roleLabel(role: UserRole | string) {
  if (role === UserRole.PLATFORM_ADMIN) {
    return "مالك المنصة";
  }
  if (role === UserRole.ADMIN) {
    return "مشرف";
  }
  if (role === UserRole.TEACHER) {
    return "معلم";
  }
  return role;
}
