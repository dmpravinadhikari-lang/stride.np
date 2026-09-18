import { requireUser, scopeOf } from "@/lib/auth/current";
import { branchFilter } from "@/lib/db/scope";
import { localDay } from "@/lib/dates";
import { TopBar } from "./top-bar";
import { logout } from "@/lib/auth/actions";
import Link from "next/link";
import { buildNav, primaryTabs } from "@/lib/nav";
import { Icon } from "@/components/Icon";
import { allowanceFor } from "@/lib/usage";
import { planOf } from "@/lib/plans";
import { all, scalar } from "@/lib/db";
import { Logo } from "@/components/Logo";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { NavLink } from "@/components/NavLink";
import { MobileNav } from "@/components/MobileNav";

import { PageTransition } from "@/components/PageTransition";
import { enabledModuleIds } from "@/lib/modules/entitlements";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const scope = scopeOf(user);
  const branch = branchFilter(scope, "p");
  const scopeSql = branch.sql;
  const scopeParams = branch.params;

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

  // Two counts worth putting on the menu: work of mine that is late, and
  // students nobody owns. Anything else would be noise on a nav.
  const staff = user.role !== "student";
  const today = localDay();
  const badges = staff
    ? {
        tasks: scalar(
          `SELECT COUNT(*) FROM tasks t
            WHERE t.tenant_id = ? AND t.status = 'open' AND t.due_on < ?
              AND (t.assignee_id = ? OR t.team_id IN (SELECT team_id FROM team_members WHERE user_id = ?))`,
          user.tenantId, today, user.id, user.id,
        ),
        students: scalar(
          `SELECT COUNT(*) FROM pipeline_entries p
            WHERE p.tenant_id = ? AND p.counsellor_id IS NULL
              AND p.stage NOT IN ('departed','lost')${scopeSql}`,
          user.tenantId, ...scopeParams,
        ),
      }
    : {};

  const groups = buildNav({ role: user.role, plan: user.tenantPlan, enabledIds }, badges);
  const primary = primaryTabs(user.role, badges);

  const budget = allowanceFor({
    tenantId: user.tenantId, tenantKind: user.tenantKind, tenantPlan: user.tenantPlan,
    userId: user.id, studentPlan: user.studentPlan,
  });

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <MobileNav
        groups={groups}
        primary={primary}
        credits={{ remaining: budget.remaining, allowance: budget.allowance, scopeLabel: budget.scopeLabel }}
        userName={user.fullName}
        userRole={ROLE_LABEL[user.role]}
        tenantName={user.branchName ? `${user.tenantName} · ${user.branchName}` : user.tenantName}
        planLabel={planOf(user.tenantPlan).label}
        isStaff={staff}
      />

      {/* ------------------------------------------------ the rail, desktop */}
      <aside className="hidden bg-rail lg:sticky lg:top-0 lg:block lg:h-screen lg:w-[248px] lg:shrink-0">
        <div className="flex h-full flex-col text-rail-ink">
          <div className="flex items-center justify-between gap-2 px-4 py-4">
            <Logo href="/app" tone="light" />
            <span className="rounded-full bg-rail-2 px-2.5 py-1 text-[11px] font-semibold text-brand-300">
              {planOf(user.tenantPlan).label}
            </span>
          </div>

          <nav aria-label="Main" className="scroll-soft flex-1 overflow-y-auto px-2.5 pb-4">
            {groups.map((g, i) => (
              <div key={g.group ?? "main"} className={i === 0 ? "flex flex-col gap-0.5" : "mt-5 flex flex-col gap-0.5"}>
                {g.group && (
                  <div className="px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-rail-ink/45">
                    {g.group}
                  </div>
                )}
                {g.items.map((it) => (
                  <NavLink key={it.href + it.label} {...it} />
                ))}
              </div>
            ))}
          </nav>

          {/* credits */}
          <div className="px-4 py-3">
            <div className="flex items-baseline justify-between text-[11.5px]">
              <span className="font-semibold text-rail-ink/80">AI credits</span>
              <span className="num text-rail-ink/60">{budget.remaining} / {budget.allowance}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-rail-2">
              <div
                className={`h-full rounded-full ${budget.remaining === 0 ? "bg-danger-600" : budget.remaining < budget.allowance * 0.2 ? "bg-gold-600" : "bg-brand-300"}`}
                style={{ width: `${budget.allowance ? Math.min(100, (budget.used / budget.allowance) * 100) : 0}%` }}
              />
            </div>
          </div>

          <div className="border-t border-white/10 px-4 py-3.5">
            <Link href="/app/profile" className="flex items-center gap-2.5 rounded-[10px] py-1 hover:text-white">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rail-3 text-[12px] font-semibold text-white">
                {user.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-white">{user.fullName}</span>
                <span className="block truncate text-[11.5px] text-rail-ink/60">{ROLE_LABEL[user.role]}</span>
              </span>
            </Link>
            <div className="mt-2 text-[11.5px] leading-snug text-rail-ink/55">
              {user.tenantName}{user.branchName ? `, ${user.branchName}` : ""}
              {user.branchName && user.role !== "student" && (
                // Which office you are looking at. On a multi-branch
                // consultancy a number with no office attached to it is a
                // number you cannot act on.
                <span className="mt-0.5 block text-rail-ink/45">
                  {user.isHeadOffice || user.role === "tenant_admin" ? "Seeing every office" : `Seeing ${user.branchName} only`}
                </span>
              )}
            </div>
            <form action={logout} className="mt-2">
              <button type="submit" className="inline-flex min-h-[32px] items-center gap-1.5 text-[12.5px] font-semibold text-rail-ink/60 hover:text-white">
                <Icon name="logout" size={15} /> Log out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-canvas">
        {staff && <TopBar office={user.branchName} seesAll={user.isHeadOffice || user.role === "tenant_admin" || user.role === "super_admin"} />}
        {/* the extra bottom padding clears the mobile tab bar */}
        <div className="mx-auto max-w-[1160px] px-4 pb-28 pt-5 sm:px-6 sm:py-6 lg:pb-8">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}

export const metadata = { title: "STRIDE" };

// Every page here reads the signed-in user, so nothing is safe to pre-render.
export const dynamic = "force-dynamic";
