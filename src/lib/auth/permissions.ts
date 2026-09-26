import type { Role } from "@/lib/auth/roles";

/**
 * Who can do what, in one place.
 *
 * Until now each screen made its own judgement, some checked isStaff(), some
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

  // --- partners and the money
  "partners:view": "See the partner institutions and where to send a student first",
  "partners:manage": "Add and edit partner institutions",
  "partners:money": "See commission rates and what each institution owes",
  "applications:manage": "Create and update a student's applications",

  // --- enquiries, which arrive before anybody is a student
  "leads:view": "See the enquiry board",
  "leads:manage": "Write and update enquiries, and convert them",
  "leads:assign": "Hand an enquiry to somebody else",

  // --- the working day
  "tasks:assign": "Put a task on somebody else's desk",
  "attendance:view": "See who was in, across the office",
  "attendance:manage": "Correct a punch and approve leave",
  "tests:manage": "Run mock tests: papers, bookings and results",
  "market:view": "See market intelligence: demand, intakes, what is moving",

  // --- money that is not payroll
  "money:view": "See invoices and what students owe",
  "money:manage": "Raise invoices and record payments",

  // --- people
  "hr:view": "See the staff list, positions and joining dates",
  "hr:manage": "Add and edit staff records",
  "payroll:run": "See salaries, prepare a pay run and mark it paid",

  // --- consultancy administration
  "branch:settings": "Change the consultancy's own settings and branding",
  "branch:staff": "Add and remove counsellor accounts",
  "people:permissions": "Change what colleagues are allowed to do",
  "audit:view": "Read the trail of who saw and changed what",

  // --- content
  "bank:review": "Review and correct question bank items",
  "bank:publish": "Publish or unpublish a paper to students",

  // --- platform-wide. These deliberately cross consultancies.
  "platform:admin": "Open the platform admin console",
  "platform:tenants": "See and change every consultancy",
  "platform:reports": "See reports across the whole platform",
} as const;

export type Capability = keyof typeof CAPABILITIES;
export const isCapability = (id: string): id is Capability => id in CAPABILITIES;

const STUDENT: Capability[] = [
  "self:view", "self:edit", "self:documents", "self:practice", "self:share_parent",
];

const COUNSELLOR: Capability[] = [
  ...STUDENT,
  "students:view", "students:create", "students:manage", "students:documents",
  "students:share_parent", "reports:branch", "bank:review",
  "leads:view", "leads:manage", "leads:assign", "tasks:assign",
  // The partner list and the applications, but deliberately not the money.
  // A counsellor who knows which institution pays best is under quiet
  // pressure to send students there.
  "partners:view", "applications:manage",
  // The staff list, but never the salaries.
  "hr:view",
];

const TENANT_ADMIN: Capability[] = [
  ...COUNSELLOR, "branch:settings", "branch:staff",
  "partners:manage", "partners:money",
  "hr:manage", "payroll:run",
  "attendance:view", "attendance:manage", "tests:manage", "market:view",
  "money:view", "money:manage", "people:permissions", "audit:view",
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

/**
 * What a ROLE may do, which is now only half the answer.
 *
 * A person's real permissions come from their position and their own named
 * exceptions, resolved in `@/lib/auth/access`. This stays because the role is
 * still the outer bound: a student is never given a staff capability by a
 * position, and the platform console still asks this question.
 */
export const roleCan = (role: Role, capability: Capability): boolean =>
  ROLE_CAPABILITIES[role]?.includes(capability) ?? false;

/** @deprecated Use `can(user, capability)` from `@/lib/auth/access`. */
export const can = roleCan;

export const capabilitiesOf = (role: Role) => ROLE_CAPABILITIES[role] ?? [];

/** Grouped for display, so the matrix reads in a sensible order. */
export const CAPABILITY_GROUPS: Array<{ group: string; caps: Capability[] }> = [
  { group: "Their own account", caps: ["self:view", "self:edit", "self:documents", "self:practice", "self:share_parent"] },
  { group: "Students at their consultancy", caps: ["students:view", "students:create", "students:manage", "students:documents", "students:share_parent", "reports:branch"] },
  { group: "Enquiries", caps: ["leads:view", "leads:manage", "leads:assign"] },
  { group: "Partners and applications", caps: ["partners:view", "applications:manage", "partners:manage", "partners:money"] },
  { group: "The working day", caps: ["tasks:assign", "attendance:view", "attendance:manage", "tests:manage", "market:view"] },
  { group: "Invoices", caps: ["money:view", "money:manage"] },
  { group: "People and pay", caps: ["hr:view", "hr:manage", "payroll:run"] },
  { group: "Running the consultancy", caps: ["branch:settings", "branch:staff", "people:permissions", "audit:view"] },
  { group: "Question bank", caps: ["bank:review", "bank:publish"] },
  { group: "Across the whole platform", caps: ["platform:admin", "platform:tenants", "platform:reports"] },
];
