import type { AuthUser } from "@/lib/types";

export type Role = "super_admin" | "manager" | "editor" | "reviewer" | "image_editor";

/** Managers and super admins can do everything; others need one of `roles`. */
export function hasRole(user: AuthUser | null, ...roles: Role[]): boolean {
  if (!user) return false;
  return user.roles.some(
    (r) => r === "super_admin" || r === "manager" || roles.includes(r as Role),
  );
}

export const canEdit = (user: AuthUser | null) => hasRole(user, "editor", "reviewer");
export const canReview = (user: AuthUser | null) => hasRole(user, "reviewer");
export const canPublish = (user: AuthUser | null) => hasRole(user);
export const canUploadImages = (user: AuthUser | null) => hasRole(user, "image_editor");
