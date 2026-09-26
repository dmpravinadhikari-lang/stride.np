import type { Capability } from "@/lib/auth/permissions";

/**
 * Who actually works at an education consultancy.
 *
 * OfficeYak had two words for everybody on the staff: admin and counsellor. That
 * is not how these offices are staffed. A receptionist writes down every
 * walk-in and has no business opening a family's bank statement. A
 * documentation officer lives in the files and has nothing to do with
 * commission. An accountant needs the money and none of the passports. A
 * marketing officer wants to know which source produces enrolments and should
 * never read a student's file. Calling all of them "counsellor" was a hole,
 * and making them admins so they could do their job was a bigger one.
 *
 * A position is a job, not a permission level. Somebody setting this up should
 * recognise their own staff in this list and be finished in a minute, which is
 * why these are the titles Nepali consultancies actually advertise.
 */

export const SCOPES = {
  own: {
    label: "Only their own",
    blurb: "Files and enquiries with their name on them, and nothing else.",
  },
  office: {
    label: "Their office",
    blurb: "Everything at the branch they work at.",
  },
  all: {
    label: "Every office",
    blurb: "The whole consultancy, all branches.",
  },
} as const;
export type DataScope = keyof typeof SCOPES;
export const isDataScope = (id: string): id is DataScope => id in SCOPES;

export type Position = {
  id: string;
  label: string;
  /** What this person does all day, in one line. */
  blurb: string;
  /** How far they see by default. An admin can narrow or widen one person. */
  scope: DataScope;
  grants: Capability[];
  tint: string;
  ink: string;
};

/** What anybody on the staff can do with their own account. */
const SELF: Capability[] = ["self:view", "self:edit"];

/** The counselling core: enquiries in, files worked, documents read. */
const COUNSELLING: Capability[] = [
  ...SELF,
  "leads:view", "leads:manage",
  "students:view", "students:create", "students:manage", "students:share_parent",
  "students:documents", "applications:manage", "partners:view",
  "hr:view", "bank:review",
];

export const POSITIONS: Position[] = [
  {
    id: "owner",
    label: "Managing director",
    blurb: "Runs the consultancy. Everything, including salaries.",
    scope: "all",
    grants: [
      ...COUNSELLING, "leads:assign", "students:share_parent", "reports:branch",
      "tasks:assign", "attendance:view", "attendance:manage", "tests:manage", "market:view",
      "money:view", "money:manage", "partners:manage", "partners:money",
      "hr:manage", "payroll:run", "branch:settings", "branch:staff",
      "people:permissions", "audit:view",
    ],
    tint: "bg-tint-sky", ink: "text-tint-sky-ink",
  },
  {
    id: "branch_manager",
    label: "Branch manager",
    blurb: "Runs one office: its people, its enquiries, its numbers. Not the company payroll.",
    scope: "office",
    grants: [
      ...COUNSELLING, "leads:assign", "reports:branch", "tasks:assign",
      "attendance:view", "attendance:manage", "market:view", "money:view",
      "branch:staff", "tests:manage",
    ],
    tint: "bg-tint-lilac", ink: "text-tint-lilac-ink",
  },
  {
    id: "senior_counsellor",
    label: "Senior counsellor",
    blurb: "Counsels, and looks after the desk: hands enquiries out, checks the follow-ups.",
    scope: "office",
    grants: [...COUNSELLING, "leads:assign", "reports:branch", "tasks:assign", "attendance:view"],
    tint: "bg-tint-mint", ink: "text-tint-mint-ink",
  },
  {
    id: "counsellor",
    label: "Counsellor",
    blurb: "Their own students and enquiries, from the first call to the visa.",
    scope: "office",
    grants: [...COUNSELLING, "reports:branch", "tasks:assign", "leads:assign"],
    tint: "bg-tint-amber", ink: "text-tint-amber-ink",
  },
  {
    id: "front_desk",
    label: "Front desk",
    blurb: "Writes down every walk-in and call. No student files, no documents, no money.",
    scope: "office",
    grants: [...SELF, "leads:view", "leads:manage", "attendance:view"],
    tint: "bg-tint-rose", ink: "text-tint-rose-ink",
  },
  {
    id: "documentation",
    label: "Documentation officer",
    blurb: "Lives in the paperwork: checks documents and keeps files complete.",
    scope: "office",
    grants: [
      ...SELF, "students:view", "students:manage", "students:documents",
      "applications:manage", "hr:view",
    ],
    tint: "bg-tint-sky", ink: "text-tint-sky-ink",
  },
  {
    id: "visa_officer",
    label: "Visa and admissions officer",
    blurb: "Applications, offers and visa files. Deals with the universities.",
    scope: "office",
    grants: [
      ...SELF, "students:view", "students:manage", "students:documents",
      "applications:manage", "partners:view", "partners:manage", "reports:branch",
    ],
    tint: "bg-tint-lilac", ink: "text-tint-lilac-ink",
  },
  {
    id: "test_prep",
    label: "IELTS or PTE instructor",
    blurb: "Classes and mock tests. Sees a student's scores, not their bank letter.",
    scope: "office",
    grants: [...SELF, "students:view", "tests:manage", "bank:review"],
    tint: "bg-tint-mint", ink: "text-tint-mint-ink",
  },
  {
    id: "accounts",
    label: "Accountant",
    blurb: "Fees, invoices, commission and payroll. No student documents.",
    scope: "all",
    grants: [
      ...SELF, "money:view", "money:manage", "payroll:run", "hr:view",
      "partners:view", "partners:money", "reports:branch", "attendance:view",
    ],
    tint: "bg-tint-amber", ink: "text-tint-amber-ink",
  },
  {
    id: "marketing",
    label: "Marketing officer",
    blurb: "Where enquiries come from and what they cost. Counts students, does not read them.",
    scope: "all",
    grants: [...SELF, "leads:view", "market:view", "reports:branch"],
    tint: "bg-tint-peach", ink: "text-tint-peach-ink",
  },
  {
    id: "auditor",
    label: "Auditor",
    blurb: "Reads, changes nothing. For an outside accountant or a compliance check.",
    scope: "all",
    grants: [...SELF, "students:view", "reports:branch", "money:view", "payroll:run", "audit:view"],
    tint: "bg-wash", ink: "text-ink-2",
  },
];

export const POSITION_IDS = POSITIONS.map((p) => p.id);
export const isPosition = (id: string): boolean => POSITION_IDS.includes(id);
export const positionOf = (id: string | null | undefined): Position =>
  POSITIONS.find((p) => p.id === id) ?? POSITIONS.find((p) => p.id === "counsellor")!;

/**
 * What an account gets when nobody has chosen a position for it.
 *
 * Every consultancy already using OfficeYak has staff with a role and no
 * position, and they must keep working exactly as they did this morning. The
 * two old words map onto the two positions that mean the same thing.
 */
export const defaultPositionFor = (role: string): string =>
  role === "tenant_admin" || role === "super_admin" ? "owner" : "counsellor";
