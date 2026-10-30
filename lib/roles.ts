import type { AuthUser, Team } from "@/lib/types";

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

/** Exact role checks (no manager fallback), for choosing which home screen to show */
export const isManager = (user: AuthUser | null) =>
  !!user?.roles.some((r) => r === "manager" || r === "super_admin");
export const isWriter = (user: AuthUser | null) => !!user?.roles.includes("editor");
export const isReviewer = (user: AuthUser | null) => !!user?.roles.includes("reviewer");
export const isImageEditor = (user: AuthUser | null) => !!user?.roles.includes("image_editor");

const TEAMS: Team[] = ["writer", "reviewer", "image"];

/** Teams the user leads (負責人) */
export const leadTeams = (user: AuthUser | null): Team[] => TEAMS.filter((t) => user?.teams?.[t] === "lead");

/** Managers and team leads open 分派 and 同工 */
export const canManageStaff = (user: AuthUser | null) => isManager(user) || leadTeams(user).length > 0;
