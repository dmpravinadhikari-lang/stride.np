import { Fragment } from "react";
import Link from "next/link";
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
import { Alert, Card, Chip, PageHeader, ScrollHint, Th } from "@/components/ui";
import { platformAnalytics } from "@/lib/analytics/platform";
import { toolStats, readTool } from "@/lib/analytics/tools";
import { VERDICT_STYLE } from "@/lib/analytics/metric";
import { MetricGrid } from "@/components/MetricCard";
import { YakSays } from "@/components/YakSays";
import { Drawer, Kpi, NavyCard, PeakCard } from "@/components/brand-ui";
import { everyPost, isLive } from "@/lib/blog";

export const metadata = { title: "Admin console, OfficeYak" };

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

  /*
   * The one sentence the console exists to answer.
   *
   * Every headline metric already carries its own verdict and the thing to do
   * about it, so the Yak does not need a second opinion, only the worst one.
   * A bad verdict beats a watch, and when everything is fine it says nothing
   * at all rather than manufacturing a job.
   */
  const worst =
    platform.headline.find((m) => m.verdict === "bad" && m.action) ??
    platform.headline.find((m) => m.verdict === "watch" && m.action) ??
    null;

  const consultancies = tenants.filter((t) => t.kind === "consultancy");
  // Sorted worst first: a branch that has gone silent outranks one that is
  // only worth watching, and the heading counts the ones that need the call.
  const quiet = [
    ...platform.branches.filter((b) => b.health === "bad"),
    ...platform.branches.filter((b) => b.health === "watch"),
  ];
  const needCall = platform.branches.filter((b) => b.health === "bad").length;
  const usdToNpr = 140;                       // for the rough margin line only
  const aiNpr = Math.round(monthCost * usdToNpr);
  const kept = mrr - aiNpr;
  const keptPct = mrr > 0 ? Math.round((kept / mrr) * 100) : 100;
  const metric = (id: string) => platform.headline.find((m) => m.id === id);
  /*
   * Writing is a platform job, not a consultancy one, so its numbers belong
   * on this page. A guide that says "last checked in March" and has not been
   * is worse than one with no date at all, which is why the stale count is
   * here rather than buried in the blog editor.
   */
  const posts = everyPost();
  const livePosts = posts.filter(isLive);
  const drafts = posts.length - livePosts.length;
  const ninetyDaysAgo = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  const stale = livePosts.filter((p) => (p.updatedOn ?? "") < ninetyDaysAgo);

  const enginesReady = aiHealth.filter((h) => h.ok).length + emailHealth.filter((h) => h.ok).length;
  const topModule = byModule.length
    ? (MODULES.find((x) => x.id === byModule[0].module_id)?.name ?? byModule[0].module_id)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Platform"
        sub="Every consultancy on OfficeYak, and what running them costs."
        actions={
          <div className="flex flex-wrap gap-2">
            {[["Blog and drafts", "/app/admin/blog"], ["Testimonials", "/app/admin/testimonials"]].map(([label, href]) => (
              <a
                key={href} href={href}
                className="inline-flex min-h-[40px] items-center rounded-[10px] border border-line-2 bg-panel px-4 text-[13.5px] font-medium text-ink hover:border-brand-400 hover:text-brand-600"
              >
                {label}
              </a>
            ))}
          </div>
        }
      />

      {worst && (
        <YakSays
          says={worst.action!}
          because={`${worst.label} is ${worst.display}${worst.basis ? `, ${worst.basis}` : ""}.`}
        />
      )}

      {/*
        The money, and nothing beside it.

        This was one tile in a row of four, the same size as the count of user
        accounts. It is not the same size as the count of user accounts: it is
        the only figure on the page that decides whether the product is a
        business, so it gets the one Navy card the page is allowed and the
        biggest numerals on it.
      */}
      <NavyCard decoration="ridge">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="grid flex-1 gap-8 sm:grid-cols-3">
            <Kpi
              tone="dark" peak="grow" size={34}
              value={`NPR ${mrr.toLocaleString("en-IN")}`}
              label="Contracted a month"
              sub={`${consultancies.length} ${consultancies.length === 1 ? "consultancy" : "consultancies"} on a plan`}
            />
            <Kpi
              tone="dark" peak="prepare" size={34}
              value={`$${monthCost.toFixed(2)}`}
              label="AI spent this month"
              sub={`${monthCalls.toLocaleString("en-US")} ${monthCalls === 1 ? "call" : "calls"}`}
            />
            <Kpi
              tone="dark" peak="run" size={34}
              value={`${keptPct}%`}
              label="Kept after the AI"
              sub={`NPR ${kept.toLocaleString("en-IN")} of it, at roughly NPR ${usdToNpr} to the dollar`}
            />
          </div>
        </div>
      </NavyCard>

      {/*
        The three jobs the product does, which is how the guidelines group it
        and how an owner thinks about it: is it growing, are the students
        being prepared, is the place running. One figure each, with the peak's
        own rule under it, and the detail behind the drawers below.
      */}
      <div className="grid gap-4 lg:grid-cols-3">
        <PeakCard peak="grow" icon="chart" name="Grow">
          <Kpi
            peak="grow"
            value={consultancies.length}
            label="Consultancies signed up"
            sub={`${totalStudents.toLocaleString("en-US")} students across all of them`}
          />
          <p className="text-[13px] leading-relaxed text-ink-2">
            Consultancies on a plan. This is the number the business runs on, and it moves
            slowly enough that a single one leaving is worth a phone call.
          </p>
          <Link href="/app/admin#consultancies" className="text-[13.5px] font-semibold text-brand-600 hover:underline">
            Every consultancy →
          </Link>
        </PeakCard>

        <PeakCard peak="prepare" icon="cap" name="Prepare">
          <Kpi
            peak="prepare"
            value={monthCalls.toLocaleString("en-US")}
            label="AI jobs run this month"
            sub={topModule ? `mostly ${topModule}` : "nothing yet this month"}
          />
          <p className="text-[13px] leading-relaxed text-ink-2">
            Mock marking, interviews, statements and document checks. This is the half of the
            product a student touches, and the only half that costs money per use.
          </p>
        </PeakCard>

        <PeakCard peak="run" icon="file" name="Write">
          <Kpi
            peak="run"
            value={livePosts.length}
            label="Guides published"
            sub={
              drafts > 0
                ? `${drafts} in draft · ${stale.length} not checked in 90 days`
                : `${stale.length} not checked in 90 days`
            }
          />
          <p className="text-[13px] leading-relaxed text-ink-2">
            Guides are how consultancies and students find OfficeYak without being paid for.
            A guide carrying a review date it has outgrown is worse than one with no date.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/app/admin/blog" className="text-[13.5px] font-semibold text-brand-600 hover:underline">
              Write and edit →
            </Link>
            <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer"
              className="text-[13.5px] font-semibold text-brand-600 hover:underline">
              Search Console →
            </a>
          </div>
        </PeakCard>
      </div>

      {/* -------------------------------------------------- needs attention */}
      <section>
        <h2 className="h-tight text-[17px]">
          {needCall === 0
            ? quiet.length === 0 ? "Nothing needs a call" : "Nothing urgent, a few worth watching"
            : needCall === 1 ? "One consultancy needs a call" : `${needCall} consultancies need a call`}
        </h2>
        <p className="mt-1 max-w-3xl text-[13.5px] leading-relaxed text-ink-2">{platform.summary}</p>

        {quiet.length === 0 ? (
          <Card className="mt-3 p-5">
            <p className="text-[13.5px] text-ink-2">
              Every consultancy has been active recently. The full list is in the drawer below.
            </p>
          </Card>
        ) : (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {quiet.map((b) => {
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
        )}
      </section>

      {/*
        Everything below is reference: true, occasionally needed, and not the
        thing you opened the console to find out. It opens on request.
      */}
      <div className="flex flex-col gap-3">

      <Drawer
        id="consultancies"
        title="Every consultancy, and its plan"
        note="Changing a plan moves the module locks and the monthly credit ceiling immediately. There is no payment gateway yet, so this is how a paying customer is switched on."
        count={tenants.length}
      >
        <div className="scroll-soft overflow-x-auto rounded-xl border border-line">
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
      </Drawer>

      <Drawer
        title="Who can do what"
        note="The real permission table, read straight out of the code, so it cannot drift from what the app enforces."
        count={`${ROLES.length} roles`}
      >
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-2">
          The real permission table, read straight out of the code rather than written down
          separately, so it cannot drift from what the app actually enforces. Two rules apply on
          top of everything here: a capability never crosses consultancies unless it is marked
          platform-wide, and a student always reaches their own records.
        </p>
        <div className="scroll-soft mt-4 overflow-x-auto rounded-xl border border-line">
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
      </Drawer>

      <Drawer
        title="Engines"
        note="The AI provider and the mail provider, and whether each can currently answer."
        count={`${enginesReady} ready`}
      >
        <div className="grid gap-3 lg:grid-cols-2">
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
      </Drawer>

      <Drawer
        title="What is costing money"
        note={`${MODULES.filter((m) => Object.keys(m.credits).length === 0).length} of ${MODULES.length} modules cost nothing per use. Those are the ones served free and without an account.`}
        count={`$${monthCost.toFixed(2)}`}
      >
        <div className="scroll-soft overflow-x-auto rounded-xl border border-line">
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
      </Drawer>

      <Drawer title="Every headline figure, with its verdict" note="The same numbers the cards above read from, each with what it means and what to do.">
        <MetricGrid metrics={platform.headline} />
      </Drawer>

      <Drawer title="Every consultancy's activity" note="Including the ones that need nothing." count={platform.branches.length}>
        <div className="grid gap-3 lg:grid-cols-2">
          {platform.branches.map((b) => {
            const style = VERDICT_STYLE[b.health];
            return (
              <div key={b.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-ink">{b.name}</div>
                    <div className="mono text-[11.5px] text-muted">{b.slug}.{BRAND.domain} &middot; {b.plan}</div>
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
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">{b.reading}</p>
              </div>
            );
          })}
        </div>
      </Drawer>

      <Drawer
        title="Which free tools people actually use"
        note="Two integers per tool per day, counted on our own server. No cookie, no address, nothing that could identify a visitor."
        count={tools.length}
      >
        {tools.length === 0 ? (
          <p className="text-[13.5px] text-muted">
            Nothing counted yet. Figures appear here as soon as the free tools get visitors.
          </p>
        ) : (
          <>
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
          </>
        )}
      </Drawer>

      <Drawer
        title="Traffic"
        note="Where people came from, and what happened once they arrived. Two different questions, answered by two different things."
      >
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-ink-2">
          Two different questions, answered by two different things. Google Analytics tells you
          <strong className="font-semibold text-ink"> how people found you</strong>, search
          terms, referrals, which guide brought them in. Everything else on this page is measured
          here on your own server and tells you{" "}
          <strong className="font-semibold text-ink">what happened once they arrived</strong>.
          Google never sees a student, a consultancy or a document, because the tag is not loaded
          on any page where one appears.
        </p>
        <div className="mt-4">
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
        </div>
      </Drawer>

      </div>
    </div>
  );
}
