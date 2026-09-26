import type { Role } from "@/lib/auth/roles";
import { isStaff } from "@/lib/auth/roles";
import { navFor, type Viewer } from "@/lib/modules/registry";
import { iconFor, type IconName } from "@/components/Icon";
import { planAllows, type PlanFeature } from "@/lib/plans";
import type { Capability } from "@/lib/auth/permissions";

export type NavItem = {
  href: string; icon: IconName; label: string;
  state: "open" | "locked" | "soon"; exact?: boolean;
  /** Four or five words under the label, so nobody has to be shown around. */
  hint?: string;
  /** A count worth interrupting for: work that is late or unassigned. */
  badge?: number;
};
export type NavGroup = {
  group: string | null;
  items: NavItem[];
  /** Drawn closed until it is opened, or until the page inside it is open. */
  fold?: boolean;
  /** One line under the group heading, so a closed group still says what is in it. */
  hint?: string;
};

/**
 * The app menu, in one place, for the sidebar and the phone drawer alike.
 *
 * Staff see their daily work first, in the words an office uses: Students,
 * Tasks, Attendance. Running the office comes next. The practice tools built
 * for students sit last, under a heading that says whose they are, so a new
 * counsellor is never left wondering whether "SOP Studio" is their job.
 */
export type Badges = { tasks?: number; students?: number; leads?: number };

export function buildNav(
  viewer: Viewer & { role: Role; caps?: Set<Capability> },
  badges: Badges = {},
): NavGroup[] {
  /*
   * What this person may actually open.
   *
   * A front desk account has no business seeing a Payroll link, and an
   * accountant has no use for the enquiry board. The server refuses either
   * way: this only stops the rail offering a door that will not open.
   */
  const may = (c: Capability) => !viewer.caps || viewer.caps.has(c);
  const modules = navFor(viewer);
  const item = (id: string) => {
    for (const g of modules) {
      const hit = g.items.find((i) => i.mod.id === id);
      if (hit) return hit;
    }
    return null;
  };
  const fromModule = (id: string, label?: string): NavItem[] => {
    const hit = item(id);
    if (!hit) return [];
    return [{
      href: hit.state === "open" ? hit.mod.route : `/app/soon/${hit.mod.id}`,
      icon: iconFor(hit.mod.icon), label: label ?? hit.mod.name, state: hit.state,
    }];
  };

  if (!isStaff(viewer.role)) {
    return [
      { group: null, items: [
        { href: "/app", icon: "home", label: "Home", state: "open", exact: true },
        { href: "/app/profile", icon: "user", label: "My profile", state: "open" },
        { href: "/app/progress", icon: "trophy", label: "My progress", state: "open" },
      ] },
      ...modules.map((g) => ({
        group: g.group,
        items: g.items.map(({ mod, state }) => ({
          href: state === "open" ? mod.route : `/app/soon/${mod.id}`,
          icon: iconFor(mod.icon), label: mod.name, state,
        })),
      })),
    ];
  }

  const admin = viewer.role === "tenant_admin" || viewer.role === "super_admin";
  const placed = new Set(["pipeline", "documents", "reports", "parents"]);

  const has = (f: PlanFeature) => planAllows(String(viewer.plan), f);

  /*
   * Five rows, then three folds.
   *
   * There were twenty links in this rail, every one of them the same size, so
   * the five screens a counsellor opens forty times a day sat in a list beside
   * Payroll and the SOP studio and were no easier to find. Pravin, running the
   * console as the owner: "THERE ARE TOO MANY THINGS IN THE SIDEBAR. TRY TO
   * AGGREGRATE THINGS."
   *
   * So the daily work is always on screen and nothing else is. What is left is
   * three closed folds, each named for a job rather than for a part of the
   * software: what the office runs on, what the owner sets up, and the practice
   * tools that belong to students. A fold opens itself when the page inside it
   * is the one being looked at, so following a link never leaves the rail
   * disagreeing with the screen.
   */
  const groups: NavGroup[] = [
    { group: null, items: [
      { href: "/app", icon: "home", label: "Home", state: "open", exact: true, hint: "What needs you now" },
      // Named for what an office calls them. "Enquiries" was the correct word
      // and the wrong one: asked where the leads were, the owner could not
      // find this row.
      ...(may("leads:view")
        ? [{ href: "/app/leads", icon: "inbox" as const, label: "Student leads", state: "open" as const, hint: "Walk-ins and calls", badge: badges.leads }]
        : []),
      ...(may("students:view")
        ? fromModule("pipeline", "Students").map((i) => ({ ...i, hint: "Every file, by stage", badge: badges.students }))
        : []),
      { href: "/app/tasks", icon: "tasks", label: "Tasks", state: "open", hint: "What you owe today", badge: badges.tasks },
      { href: "/app/attendance", icon: "clock", label: "Attendance", state: "open", hint: "Clock in and out" },
    ] },
    { group: "Office", fold: true, hint: "Files, numbers, partners", items: [
      ...(may("students:documents") ? fromModule("documents", "Documents") : []),
      ...(may("reports:branch") ? fromModule("reports", "Reports") : []),
      ...(has("market") && may("market:view") ? [{ href: "/app/market", icon: "chart" as const, label: "Market", state: "open" as const }] : []),
      ...(has("partners") && may("partners:view") ? [{ href: "/app/partners", icon: "partners" as const, label: "Universities & partners", state: "open" as const }] : []),
      ...(may("students:share_parent") ? fromModule("parents", "Parents") : []),
      ...(!admin && may("hr:view") ? [{ href: "/app/people", icon: "people" as const, label: "Staff", state: "open" as const }] : []),
    ] },
    ...(() => {
      const setup: NavItem[] = [
        ...(may("hr:view") ? [{ href: "/app/people", icon: "people" as const, label: "Staff & teams", state: "open" as const }] : []),
        ...(may("people:permissions") ? [{ href: "/app/access", icon: "lock" as const, label: "Who can do what", state: "open" as const }] : []),
        ...(may("audit:view") ? [{ href: "/app/security", icon: "lock" as const, label: "Security", state: "open" as const }] : []),
        ...(may("branch:settings") ? [
          { href: "/app/branches", icon: "building" as const, label: "Offices", state: "open" as const },
          { href: "/app/kiosk", icon: "clock" as const, label: "Front desk clock", state: "open" as const },
          { href: "/app/automations", icon: "inbox" as const, label: "Automatic emails", state: "open" as const },
        ] : []),
        ...(has("payroll") && may("payroll:run")
          ? [{ href: "/app/payroll", icon: "wallet" as const, label: "Payroll", state: "open" as const }] : []),
        { href: "/app/profile", icon: "settings" as const, label: "Account & plan", state: "open" as const },
      ];
      // One item, and that item their own account, is not a group worth a fold.
      return setup.length > 1
        ? [{ group: "Set up", fold: true, hint: "Staff, offices, pay", items: setup }]
        : [];
    })(),
    { group: "Student tools", fold: true, hint: "Practice the students use", items: modules
      .flatMap((g) => g.items)
      .filter(({ mod }) => !placed.has(mod.id))
      .map(({ mod, state }) => ({
        href: state === "open" ? mod.route : `/app/soon/${mod.id}`,
        icon: iconFor(mod.icon), label: mod.name, state,
      })) },
  ];

  if (viewer.role === "super_admin") {
    groups.push({ group: "Platform", fold: true, items: [
      { href: "/app/admin", icon: "settings", label: "Platform admin", state: "open" },
    ] });
  }
  return groups.filter((g) => g.items.length > 0);
}

/** The four things under the thumb on a phone. */
export function primaryTabs(role: Role, badges: Badges = {}): NavItem[] {
  return isStaff(role)
    ? [
        { href: "/app", icon: "home", label: "Home", state: "open", exact: true },
        { href: "/app/leads", icon: "inbox", label: "Leads", state: "open", badge: badges.leads },
        { href: "/app/pipeline", icon: "students", label: "Students", state: "open", badge: badges.students },
        { href: "/app/tasks", icon: "tasks", label: "Tasks", state: "open", badge: badges.tasks },
      ]
    : [
        { href: "/app", icon: "home", label: "Home", state: "open", exact: true },
        { href: "/app/checklist", icon: "checklist", label: "Plan", state: "open" },
        { href: "/app/mock-tests", icon: "file", label: "Practice", state: "open" },
        { href: "/app/documents", icon: "folder", label: "Docs", state: "open" },
      ];
}
