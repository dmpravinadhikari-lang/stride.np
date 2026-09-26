import { Fragment } from "react";
import { BRAND } from "@/lib/brand";
import { requireCapability } from "@/lib/auth/guard";
import { all, scalar } from "@/lib/db";
import { MODULES } from "@/lib/modules/registry";
import { PLANS, PLAN_IDS, planOf } from "@/lib/plans";
import { periodStart } from "@/lib/usage";
import { activeProvider, PROVIDERS } from "@/lib/ai/provider";
import { activeEmailProvider, EMAIL_PROVIDERS } from "@/lib/email/provider";
import { gaConfigured, GA_ID } from "@/lib/analytics/ga";
import { tenantSummary } from "@/modules/reports/data";
import { ROLES, ROLE_LABEL } from "@/lib/auth/roles";
import { CAPABILITIES, CAPABILITY_GROUPS, CROSS_TENANT, can } from "@/lib/auth/permissions";
import { setTenantPlan, setTenantActive } from "./actions";
import { Alert, Card, Chip, ScrollHint, StatTile, Th } from "@/components/ui";
import { platformAnalytics } from "@/lib/analytics/platform";
import { toolStats, readTool } from "@/lib/analytics/tools";
import { VERDICT_STYLE } from "@/lib/analytics/metric";
import { MetricGrid } from "@/components/MetricCard";

export const metadata = { title: "Admin console, Stride" };

export default async function AdminPage() {
  await requireCapability("platform:admin");
  const since = periodStart();

  const tenants = tenantSummary();
  const platform = platformAnalytics();
  const tools = toolStats(30);
  const totalUsers = scalar("SELECT COUNT(*) FROM users");
  const totalStudents = scalar("SELECT COUNT(*) FROM users WHERE role = 'student'");
  const signups30 = scalar(
    "SELECT COUNT(*) FROM users WHERE created_at >= ?",
    new Date(Date.now() - 30 * 864e5).toISOString(),
  );
  const monthCost = scalar("SELECT COALESCE(SUM(est_cost_usd),0) FROM usage_events WHERE created_at >= ?", since);
  const monthCalls = scalar("SELECT COUNT(*) FROM usage_events WHERE created_at >= ?", since);
  const emailsSent = scalar("SELECT COUNT(*) FROM notifications WHERE status = 'sent'");
  const emailsFailed = scalar("SELECT COUNT(*) FROM notifications WHERE status = 'failed'");

  const mrr = tenants
    .filter((t) => t.kind === "consultancy")
    .reduce((sum, t) => sum + planOf(t.plan).priceNpr, 0);

  const ai = activeProvider();
  const aiHealth = await Promise.all(
    Object.values(PROVIDERS).map(async (p) => ({ id: p.id, label: p.label, ...(await p.health()) })),
  );
  const email = activeEmailProvider();
  const emailHealth = await Promise.all(
    Object.values(EMAIL_PROVIDERS).map(async (p) => ({ id: p.id, label: p.label, ...(await p.health()) })),
  );

  const byModule = all<{ module_id: string; calls: number; credits: number; cost: number }>(
    `SELECT module_id, COUNT(*) calls, COALESCE(SUM(credits),0) credits, COALESCE(SUM(est_cost_usd),0) cost
       FROM usage_events WHERE created_at >= ? GROUP BY module_id ORDER BY cost DESC`, since,
  );

  return (
    <div className="flex flex-col gap-7">
      <header>
        <h1 className="display text-[28px]">Admin console</h1>
        <p className="mt-2 text-[15px] text-ink-2">Everything across every consultancy on Stride.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        <a href="/app/admin/blog" className="rounded-full border border-line-2 bg-white px-4 py-2 text-[13px] font-semibold text-ink-2 hover:border-brand-400 hover:text-brand-600">
          Blog &amp; drafts →
        </a>
        <a href="/app/admin/testimonials" className="rounded-full border border-line-2 bg-white px-4 py-2 text-[13px] font-semibold text-ink-2 hover:border-brand-400 hover:text-brand-600">
          Testimonials →
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Accounts" value={totalUsers} sub={`${totalStudents} students · ${signups30} new in 30 days`} />
        <StatTile label="Consultancies" value={tenants.filter((t) => t.kind === "consultancy").length} sub="paying or piloting" />
        <StatTile label="Contracted / month" value={`NPR ${mrr.toLocaleString("en-IN")}`} sub="sum of plan prices" tone="teal" />
        <StatTile label="AI cost this month" value={`$${monthCost.toFixed(2)}`} sub={`${monthCalls} calls`} tone="gold" />
      </div>

      {/* ------------------------------------------------- platform analytics */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="h-tight text-[17px]">How the platform is doing</h2>
        </div>
        <p className="mt-1 max-w-3xl text-[13.5px] leading-relaxed text-ink-2">{platform.summary}</p>
        <div className="mt-4">
          <MetricGrid metrics={platform.headline} />
        </div>
      </section>

      {/* ------------------------------------------------------ branch health */}
      <section>
        <h2 className="h-tight text-[17px]">Which consultancies are actually using it</h2>
        <p className="mt-1 max-w-3xl text-[13.5px] leading-relaxed text-ink-2">
          A consultancy rarely cancels out of the blue, it goes quiet first. Days since
          anything happened is the earliest warning you get, and it arrives weeks before an unpaid
          invoice does.
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {platform.branches.map((b) => {
            const style = VERDICT_STYLE[b.health];
            return (
              <div key={b.id} className="settle rounded-xl border border-line bg-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-ink">{b.name}</div>
                    <div className="num text-[11.5px] text-muted">{b.slug}.{BRAND.domain} &middot; {b.plan}</div>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      background: `var(--color-tint-${style.tint})`,
                      color: `var(--color-tint-${style.tint}-ink)`,
                    }}
                  >
                    {style.word}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { k: "Students", v: String(b.students) },
                    { k: "Active (14d)", v: String(b.activeStudents) },
                    {
                      k: "Last activity",
                      v: b.lastActivityDays === null
                        ? "never"
                        : b.lastActivityDays === 0 ? "today" : `${b.lastActivityDays}d ago`,
                    },
                  ].map((x) => (
                    <div key={x.k} className="rounded-xl bg-wash px-2.5 py-2">
                      <div className="num text-[15px] font-semibold text-ink">{x.v}</div>
                      <div className="text-[10.5px] text-muted">{x.k}</div>
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">{b.reading}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------------------------------------------- free tool usage */}
      <section>
        <h2 className="h-tight text-[17px]">Which free tools people actually use</h2>
        <p className="mt-1 max-w-3xl text-[13.5px] leading-relaxed text-ink-2">
          Counted on our own server over the last 30 days. This is two integers per tool per day
          and nothing else, no cookie, no address, nothing that could identify a visitor.
          It tells you which tools earn their maintenance and which guide to write next; it
          deliberately cannot tell you who used them.
        </p>

        {tools.length === 0 ? (
          <Card className="mt-3 p-5">
            <p className="text-[13.5px] text-muted">
              Nothing counted yet. Figures appear here as soon as the free tools get visitors.
            </p>
          </Card>
        ) : (
          <Card className="mt-3 overflow-hidden">
            <div className="scroll-soft overflow-x-auto">
              <table className="w-full min-w-[560px] text-[13.5px]">
                <thead>
                  <tr className="border-b border-line bg-wash/60 text-left">
                    {["Tool", "Opened", "Got an answer", "Rate", "What that suggests"].map((h) => (
                      <Th key={h}>{h}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {tools.map((t) => (
                    <tr key={t.toolId}>
                      <td className="px-4 py-2.5 font-semibold text-ink">{t.toolId}</td>
                      <td className="num px-4 py-2.5">{t.opened}</td>
                      <td className="num px-4 py-2.5">{t.completed}</td>
                      <td className="num px-4 py-2.5">{t.completionRate}%</td>
                      <td className="px-4 py-2.5 text-[12.5px] text-muted">{readTool(t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ScrollHint>Swipe the table sideways to see the reading</ScrollHint>
          </Card>
        )}
      </section>

      {/* --------------------------------------------------------- analytics */}
      <section>
        <h2 className="h-tight text-[17px]">Traffic</h2>
        <p className="mt-1 max-w-3xl text-[13.5px] leading-relaxed text-ink-2">
          Two different questions, answered by two different things. Google Analytics tells you
          <strong className="font-semibold text-ink"> how people found you</strong>, search
          terms, referrals, which guide brought them in. Everything else on this page is measured
          here on your own server and tells you{" "}
          <strong className="font-semibold text-ink">what happened once they arrived</strong>.
          Google never sees a student, a consultancy or a document, because the tag is not loaded
          on any page where one appears.
        </p>
        <Card className="mt-3 p-5">
          {gaConfigured() ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone="teal">Google Analytics connected</Chip>
                <code className="rounded bg-wash px-2 py-1 text-[12.5px]">{GA_ID}</code>
              </div>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-2">
                The tag is loaded on the marketing pages and the free tools only. It is deliberately
                absent from <code className="rounded bg-wash px-1">/app</code> and from parent
                progress pages, a parent opening a link about their child's visa application has
                not agreed to be measured.
              </p>
              <a href="https://analytics.google.com" target="_blank" rel="noreferrer"
                className="mt-3 inline-block text-[13px] font-semibold text-brand-600 hover:underline">
                Open Google Analytics →
              </a>
            </>
          ) : (
            <Alert tone="gold" title="Google Analytics is not connected">
              Create a GA4 property, then put its measurement ID in{" "}
              <code className="rounded bg-white/60 px-1">NEXT_PUBLIC_GA_ID</code> in .env.local and
              restart. Until then no tag is loaded at all, which is the right default.
            </Alert>
          )}
        </Card>
      </section>

      {/* --------------------------------------------------------- tenants */}
      <section>
        <h2 className="h-tight text-[17px]">Consultancies</h2>
        <div className="scroll-soft mt-3 overflow-x-auto rounded-2xl border border-line bg-panel">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-wash/60 text-left">
                {["Name", "Plan", "Students", "Active", "Departed", "Credits used", ""].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">
                    {t.name} {t.kind === "direct" && <Chip tone="grey">Direct signups</Chip>}
                  </td>
                  <td className="px-4 py-3">
                    <form action={setTenantPlan} className="flex items-center gap-1.5">
                      <input type="hidden" name="tenant_id" value={t.id} />
                      <select name="plan" defaultValue={t.plan}
                        className="rounded-lg border border-line-2 bg-white px-2 py-1 text-[12.5px] focus:border-brand-400 focus:outline-none">
                        {PLAN_IDS.map((p) => <option key={p} value={p}>{PLANS[p].label}</option>)}
                      </select>
                      <button type="submit" className="rounded-lg bg-wash px-2 py-1 text-[11.5px] font-semibold text-ink-2 hover:bg-brand-50 hover:text-brand-600">
                        Set
                      </button>
                    </form>
                  </td>
                  <td className="num px-4 py-3">{t.students}</td>
                  <td className="num px-4 py-3">{t.active}</td>
                  <td className="num px-4 py-3">{t.departed}</td>
                  <td className="num px-4 py-3">{t.credits} / {planOf(t.plan).monthlyCredits}</td>
                  <td className="px-4 py-3">
                    {t.kind === "consultancy" && (
                      <form action={setTenantActive}>
                        <input type="hidden" name="tenant_id" value={t.id} />
                        <input type="hidden" name="active" value="0" />
                        <button type="submit" className="text-[12px] font-semibold text-muted hover:text-danger-600">Suspend</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[12px] text-muted">
          Changing a plan takes effect immediately, it moves the module locks and the monthly credit
          ceiling. There is no payment gateway yet, so this is how a paying customer is switched on.
        </p>
      </section>

      {/* -------------------------------------------------- access control */}
      <section>
        <h2 className="h-tight text-[17px]">Who can do what</h2>
        <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-ink-2">
          The real permission table, read straight out of the code rather than written down
          separately, so it cannot drift from what the app actually enforces. Two rules apply on
          top of everything here: a capability never crosses consultancies unless it is marked
          platform-wide, and a student always reaches their own records.
        </p>
        <div className="scroll-soft mt-3 overflow-x-auto rounded-2xl border border-line bg-panel">
          <table className="w-full min-w-[680px] text-[13px]">
            <thead>
              <tr className="border-b border-line bg-wash/60 text-left">
                <th className="px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.11em] text-muted">Capability</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-4 py-2.5 text-center text-[10.5px] font-semibold uppercase tracking-[0.11em] text-muted">
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITY_GROUPS.map((group) => (
                // The key belongs on the fragment the map returns, not on the
                // first row inside it, shorthand <> cannot carry one, which is
                // why this needs the long form.
                <Fragment key={group.group}>
                  <tr className="bg-wash/40">
                    <td colSpan={ROLES.length + 1} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.11em] text-ink-2">
                      {group.group}
                    </td>
                  </tr>
                  {group.caps.map((cap) => (
                    <tr key={cap} className="border-b border-line last:border-0">
                      <td className="px-4 py-2.5">
                        <span className="text-ink-2">{CAPABILITIES[cap]}</span>
                        {CROSS_TENANT.includes(cap) && <Chip tone="danger">crosses consultancies</Chip>}
                      </td>
                      {ROLES.map((r) => (
                        <td key={r} className="px-4 py-2.5 text-center">
                          {can(r, cap)
                            ? <span className="font-bold text-teal-700" aria-label="allowed">✓</span>
                            : <span className="text-line-2" aria-label="not allowed">·</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <ScrollHint>Swipe the table sideways to see every role</ScrollHint>
      </section>

      {/* ---------------------------------------------------------- engines */}
      <section>
        <h2 className="h-tight text-[17px]">Engines</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <div className="border-b border-line bg-wash/60 px-5 py-3"><h3 className="h-tight text-[14px]">AI</h3></div>
            <div className="divide-y divide-line">
              {aiHealth.map((h) => (
                <div key={h.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-semibold text-ink">{h.label}</span>
                      {h.id === ai.id && <Chip tone="brand">In use</Chip>}
                    </div>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{h.detail}</p>
                  </div>
                  <Chip tone={h.ok ? "teal" : "danger"}>{h.ok ? "Ready" : "Unavailable"}</Chip>
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-wash/60 px-5 py-3">
              <h3 className="h-tight text-[14px]">Email</h3>
              <span className="num text-[12px] text-muted">{emailsSent} sent · {emailsFailed} failed</span>
            </div>
            <div className="divide-y divide-line">
              {emailHealth.map((h) => (
                <div key={h.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-semibold text-ink">{h.label}</span>
                      {h.id === email.id && <Chip tone="brand">In use</Chip>}
                    </div>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{h.detail}</p>
                  </div>
                  <Chip tone={h.ok ? "teal" : "danger"}>{h.ok ? "Ready" : "Unavailable"}</Chip>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* ------------------------------------------------------- module cost */}
      <section>
        <h2 className="h-tight text-[17px]">What is costing money</h2>
        <div className="scroll-soft mt-3 overflow-x-auto rounded-2xl border border-line bg-panel">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-wash/60 text-left">
                {["Module", "Calls this month", "Credits", "Estimated cost"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.11em] text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byModule.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">No AI calls yet this month.</td></tr>
              ) : byModule.map((m) => (
                <tr key={m.module_id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">
                    {MODULES.find((x) => x.id === m.module_id)?.name ?? m.module_id}
                  </td>
                  <td className="num px-4 py-3">{m.calls}</td>
                  <td className="num px-4 py-3">{m.credits}</td>
                  <td className="num px-4 py-3">${m.cost.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[12px] text-muted">
          {MODULES.filter((m) => Object.keys(m.credits).length === 0).length} of {MODULES.length} modules
          cost nothing per use. Those are the ones served free and without an account.
        </p>
      </section>
    </div>
  );
}
