import type { Role } from "@/lib/auth/roles";

/**
 * Who can do what, in one place.
 *
 * Until now each screen made its own judgement — some checked isStaff(), some
 * listed roles inline, some checked tenant membership by hand. That works right
 * up until it does not, and the failure mode is a counsellor seeing another
 * consultancy's students. This table is the single answer, and the admin
 * console renders it so it can be read rather than inferred.
 *
 * Two rules sit OUTSIDE this table and always apply on top of it:
 *   1. Tenant isolation. A capability never crosses consultancies, except the
 *      handful marked platform-wide below.
 *   2. Ownership. A student reaches their own records regardless of role.
 */
export const CAPABILITIES = {
  // --- a student, over their own things
  "self:view": "See their own dashboard, profile and results",
  "self:edit": "Edit their own profile",
  "self:documents": "Upload and delete their own documents",
  "self:practice": "Use SOP Studio, mock interviews and mock tests",
  "self:share_parent": "Create and revoke a parent link for themselves",

  // --- staff, over students at their own consultancy
  "students:view": "See the student list and any student's file",
  "students:create": "Create student accounts",
  "students:manage": "Change stage, assign a counsellor, set the next action",
  "students:documents": "Open and verify a student's documents",
  "students:share_parent": "Create and revoke parent links for a student",
  "reports:branch": "See reports across the consultancy's own students",

  // --- consultancy administration
  "branch:settings": "Change the consultancy's own settings and branding",
  "branch:staff": "Add and remove counsellor accounts",

  // --- content
  "bank:review": "Review and correct question bank items",
  "bank:publish": "Publish or unpublish a paper to students",

  // --- platform-wide. These deliberately cross consultancies.
  "platform:admin": "Open the platform admin console",
  "platform:tenants": "See and change every consultancy",
  "platform:reports": "See reports across the whole platform",
} as const;

export type Capability = keyof typeof CAPABILITIES;

const STUDENT: Capability[] = [
  "self:view", "self:edit", "self:documents", "self:practice", "self:share_parent",
];

const COUNSELLOR: Capability[] = [
  ...STUDENT,
  "students:view", "students:create", "students:manage", "students:documents",
  "students:share_parent", "reports:branch", "bank:review",
];

const TENANT_ADMIN: Capability[] = [
  ...COUNSELLOR, "branch:settings", "branch:staff",
];

const SUPER_ADMIN: Capability[] = [
  ...TENANT_ADMIN, "bank:publish", "platform:admin", "platform:tenants", "platform:reports",
];

export const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  student: STUDENT,
  counsellor: COUNSELLOR,
  tenant_admin: TENANT_ADMIN,
  super_admin: SUPER_ADMIN,
};

/** Capabilities that intentionally reach across consultancies. */
export const CROSS_TENANT: Capability[] = ["platform:admin", "platform:tenants", "platform:reports"];

export const can = (role: Role, capability: Capability): boolean =>
  ROLE_CAPABILITIES[role]?.includes(capability) ?? false;

export const capabilitiesOf = (role: Role) => ROLE_CAPABILITIES[role] ?? [];

/** Grouped for display, so the matrix reads in a sensible order. */
export const CAPABILITY_GROUPS: Array<{ group: string; caps: Capability[] }> = [
  { group: "Their own account", caps: ["self:view", "self:edit", "self:documents", "self:practice", "self:share_parent"] },
  { group: "Students at their consultancy", caps: ["students:view", "students:create", "students:manage", "students:documents", "students:share_parent", "reports:branch"] },
  { group: "Running the consultancy", caps: ["branch:settings", "branch:staff"] },
  { group: "Question bank", caps: ["bank:review", "bank:publish"] },
  { group: "Across the whole platform", caps: ["platform:admin", "platform:tenants", "platform:reports"] },
];
