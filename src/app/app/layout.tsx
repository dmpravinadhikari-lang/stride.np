import { requireUser } from "@/lib/auth/current";
import { logout } from "@/lib/auth/actions";
import { navFor } from "@/lib/modules/registry";
import { allowanceFor } from "@/lib/usage";
import { planOf } from "@/lib/plans";
import { all } from "@/lib/db";
import { Logo } from "@/components/Logo";
import { Chip, Meter } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { NavLink } from "@/components/NavLink";
import { MobileNav, type NavGroup } from "@/components/MobileNav";
import { isStaff } from "@/lib/auth/roles";

import { PageTransition } from "@/components/PageTransition";
import { enabledModuleIds } from "@/lib/modules/entitlements";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  // What this person may open.
  //
  // For a student that is a three-way answer, plan, then the consultancy's
  // switches, then any exception set for them individually. So it is resolved
  // in one place rather than guessed at here. Staff still follow the
  // consultancy's own switches.
  let enabledIds: Set<string> | undefined;

  if (user.role === "student") {
    enabledIds = enabledModuleIds(user.id, user.tenantId, user.tenantPlan);
  } else {
    const rows = all<{ module_id: string; enabled: number }>(
      "SELECT module_id, enabled FROM tenant_modules WHERE tenant_id = ?", user.tenantId,
    );
    enabledIds = rows.length
      ? new Set(rows.filter((r) => r.enabled).map((r) => r.module_id))
      : undefined;
  }

  const groups = navFor({ role: user.role, plan: user.tenantPlan, enabledIds });

  const budget = allowanceFor({
    tenantId: user.tenantId, tenantKind: user.tenantKind, tenantPlan: user.tenantPlan,
    userId: user.id, studentPlan: user.studentPlan,
  });

  // The same nav, shaped for a drawer.
  const mobileGroups: NavGroup[] = [
    { group: "You", items: [
      { href: "/app", icon: "🏠", label: "Dashboard", state: "open" },
      { href: "/app/profile", icon: "👤", label: "My profile", state: "open" },
      ...(user.role === "student"
        ? [{ href: "/app/progress", icon: "🏆", label: "My progress", state: "open" as const }]
        : []),
      ...(user.role !== "student"
        ? [{ href: "/app/partners", icon: "🤝", label: "Partners", state: "open" as const }]
        : []),
    ] },
    ...groups.map((g) => ({
      group: g.group,
      items: g.items.map(({ mod, state }) => ({
        href: state === "open" ? mod.route : `/app/soon/${mod.id}`,
        icon: mod.icon, label: mod.name, state,
      })),
    })),
    ...(user.role === "super_admin"
      ? [{ group: "Platform", items: [{ href: "/app/admin", icon: "⚙️", label: "Admin", state: "open" as const }] }]
      : []),
  ];

  // Four destinations under the thumb. Different work, different shortcuts.
  const primary = isStaff(user.role)
    ? [
        { href: "/app", icon: "🏠", label: "Home", state: "open" as const },
        { href: "/app/pipeline", icon: "📊", label: "Students", state: "open" as const },
        { href: "/app/reports", icon: "📈", label: "Reports", state: "open" as const },
        { href: "/app/documents", icon: "🗂️", label: "Docs", state: "open" as const },
      ]
    : [
        { href: "/app", icon: "🏠", label: "Home", state: "open" as const },
        { href: "/app/checklist", icon: "✅", label: "Plan", state: "open" as const },
        { href: "/app/mock-tests", icon: "📝", label: "Practice", state: "open" as const },
        { href: "/app/documents", icon: "🗂️", label: "Docs", state: "open" as const },
      ];

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <MobileNav
        groups={mobileGroups}
        primary={primary}
        credits={{ remaining: budget.remaining, allowance: budget.allowance, scopeLabel: budget.scopeLabel }}
        userName={user.fullName}
        userRole={ROLE_LABEL[user.role]}
        tenantName={user.branchName ? `${user.tenantName} · ${user.branchName}` : user.tenantName}
        planLabel={planOf(user.tenantPlan).label}
      />

      {/* --------------------------------------------- sidebar, desktop only */}
      <aside className="hidden border-b border-line bg-panel lg:sticky lg:top-0 lg:block lg:h-screen lg:w-[264px] lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <Logo href="/app" />
            <Chip tone="brand">{planOf(user.tenantPlan).label}</Chip>
          </div>

          <nav className="scroll-soft flex-1 overflow-y-auto px-3 py-4">
            <NavLink href="/app" icon="🏠" label="Dashboard" state="open" exact />
            <NavLink href="/app/profile" icon="👤" label="My profile" state="open" />
            {user.role === "student" && (
              <NavLink href="/app/progress" icon="🏆" label="My progress" state="open" />
            )}
            {user.role !== "student" && (
              <NavLink href="/app/partners" icon="🤝" label="Partners" state="open" />
            )}

            {groups.map((g) => (
              <div key={g.group} className="mt-5">
                <div className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-muted">
                  {g.group}
                </div>
                {g.items.map(({ mod, state }) => (
                  <NavLink
                    key={mod.id}
                    href={state === "open" ? mod.route : `/app/soon/${mod.id}`}
                    icon={mod.icon} label={mod.name} state={state}
                  />
                ))}
              </div>
            ))}

            {user.role === "super_admin" && (
              <div className="mt-5">
                <div className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-muted">Platform</div>
                <NavLink href="/app/admin" icon="⚙️" label="Admin" state="open" />
              </div>
            )}
          </nav>

          {/* credits */}
          <div className="border-t border-line px-5 py-4">
            <div className="flex items-baseline justify-between text-[12px]">
              <span className="font-semibold text-ink">AI credits</span>
              <span className="num text-muted">{budget.remaining} / {budget.allowance}</span>
            </div>
            <div className="mt-2">
              <Meter
                value={budget.used} max={budget.allowance}
                tone={budget.remaining === 0 ? "danger" : budget.remaining < budget.allowance * 0.2 ? "gold" : "brand"}
              />
            </div>
            <p className="mt-2 text-[11.5px] leading-snug text-muted">
              Resets on the 1st · {budget.scopeLabel}
            </p>
          </div>

          <div className="border-t border-line px-5 py-4">
            <div className="text-[13px] font-semibold text-ink">{user.fullName}</div>
            <div className="text-[11.5px] text-muted">
              {ROLE_LABEL[user.role]} · {user.tenantName}
              {user.branchName ? ` · ${user.branchName}` : ""}
            </div>
            {user.branchName && user.role !== "student" && (
              // Which office you are looking at, and whether this view is only
              // that office. On a multi-branch consultancy a number with no
              // branch attached to it is a number you cannot act on.
              <div className="mt-1 text-[10.5px] text-muted">
                {user.isHeadOffice || user.role === "tenant_admin"
                  ? "Seeing every branch"
                  : `Seeing ${user.branchName} only`}
              </div>
            )}
            <form action={logout} className="mt-2.5">
              <button type="submit" className="text-[12px] font-semibold text-muted hover:text-danger-600">
                Log out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-canvas">
        {/* the extra bottom padding clears the mobile tab bar */}
        <div className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-8 sm:py-8 lg:pb-8">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}

export const metadata = { title: "STRIDE" };

// Every page here reads the signed-in user, so nothing is safe to pre-render.
export const dynamic = "force-dynamic";
