import type { Role } from "@/lib/auth/roles";
import { isStaff } from "@/lib/auth/roles";
import { navFor, type Viewer } from "@/lib/modules/registry";
import { iconFor, type IconName } from "@/components/Icon";

export type NavItem = {
  href: string; icon: IconName; label: string;
  state: "open" | "locked" | "soon"; exact?: boolean;
  /** A count worth interrupting for: work that is late or unassigned. */
  badge?: number;
};
export type NavGroup = { group: string | null; items: NavItem[] };

/**
 * The app menu, in one place, for the sidebar and the phone drawer alike.
 *
 * Staff see their daily work first, in the words an office uses: Students,
 * Tasks, Attendance. Running the office comes next. The practice tools built
 * for students sit last, under a heading that says whose they are, so a new
 * counsellor is never left wondering whether "SOP Studio" is their job.
 */
export type Badges = { tasks?: number; students?: number };

export function buildNav(viewer: Viewer & { role: Role }, badges: Badges = {}): NavGroup[] {
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

  const groups: NavGroup[] = [
    { group: null, items: [
      { href: "/app", icon: "home", label: "Home", state: "open", exact: true },
      ...fromModule("pipeline", "Students").map((i) => ({ ...i, badge: badges.students })),
      { href: "/app/tasks", icon: "tasks", label: "Tasks", state: "open", badge: badges.tasks },
      { href: "/app/attendance", icon: "clock", label: "Attendance", state: "open" },
      ...fromModule("documents", "Documents"),
    ] },
    { group: "Office", items: [
      { href: "/app/market", icon: "chart", label: "Market", state: "open" },
      { href: "/app/people", icon: "people", label: "Staff", state: "open" },
      { href: "/app/partners", icon: "partners", label: "Universities & partners", state: "open" },
      ...fromModule("reports", "Reports"),
      ...fromModule("parents", "Parents"),
      ...(admin
        ? [
            { href: "/app/payroll", icon: "wallet" as const, label: "Payroll", state: "open" as const },
            { href: "/app/branches", icon: "building" as const, label: "Branches", state: "open" as const },
          ]
        : []),
    ] },
    { group: "Student tools", items: modules
      .flatMap((g) => g.items)
      .filter(({ mod }) => !placed.has(mod.id))
      .map(({ mod, state }) => ({
        href: state === "open" ? mod.route : `/app/soon/${mod.id}`,
        icon: iconFor(mod.icon), label: mod.name, state,
      })) },
  ];

  if (viewer.role === "super_admin") {
    groups.push({ group: "Platform", items: [
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
        { href: "/app/pipeline", icon: "students", label: "Students", state: "open", badge: badges.students },
        { href: "/app/tasks", icon: "tasks", label: "Tasks", state: "open", badge: badges.tasks },
        { href: "/app/attendance", icon: "clock", label: "Attendance", state: "open" },
      ]
    : [
        { href: "/app", icon: "home", label: "Home", state: "open", exact: true },
        { href: "/app/checklist", icon: "checklist", label: "Plan", state: "open" },
        { href: "/app/mock-tests", icon: "file", label: "Practice", state: "open" },
        { href: "/app/documents", icon: "folder", label: "Docs", state: "open" },
      ];
}
