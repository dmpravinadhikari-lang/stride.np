export const ROLES = ["super_admin", "tenant_admin", "counsellor", "student"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Platform owner",
  tenant_admin: "Consultancy admin",
  counsellor: "Counsellor",
  student: "Student",
};

/** Roles reserved for later phases live here so screens can be built for them. */
export const PLANNED_ROLES = ["parent", "sub_agent"] as const;

export const isStaff = (role: Role) =>
  role === "super_admin" || role === "tenant_admin" || role === "counsellor";
