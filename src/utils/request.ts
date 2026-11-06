export interface RequestUserLike {
  role?: string | null;
  school_id?: string | null;
}

export function getUserSchoolId(user?: RequestUserLike, fallback = "SCH-001"): string {
  return user?.school_id || fallback;
}

export function isSuperAdmin(user?: RequestUserLike): boolean {
  return user?.role === "super_admin";
}
