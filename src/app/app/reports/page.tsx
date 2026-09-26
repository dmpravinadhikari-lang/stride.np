import Link from "next/link";
import { Icon } from "@/components/Icon";
import { requireCapability } from "@/lib/auth/guard";
import {
  activeCount, byCountry, counsellorLoad, engagement, funnel, risks, stalled,
} from "@/modules/reports/data";
import { stageOf, ACTIVE_STAGES } from "@/modules/pipeline/stages";
import { country } from "@/lib/countries";
import { showBand } from "@/modules/mock-tests/bands";
import { Card, Chip, Empty, Meter, Panel, ScrollHint, StatTile, Th, type Tone } from "@/components/ui";
import { officeBreakdown, stageCounts } from "@/modules/pipeline/data";
import { bySource, newThisMonth, stuckFiles } from "@/modules/pipeline/insight";
import { sourceOf } from "@/modules/pipeline/sources";
import { demand, splitMovements } from "@/modules/market/data";
import { shortDate } from "@/lib/dates";
import { branchAnalytics } from "@/lib/analytics/branch";
import { MetricGrid } from "@/components/MetricCard";

export const metadata = { title: "Reports, STRIDE" };

/** A rate is meaningless without the count behind it, so both are always shown. */
function Rate({ n, of, label }: { n: number; of: number; label: string }) {
  const pct = of > 0 ? Math.round((n / of) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13.5px] text-ink-2">{label}</span>
        <span className="num text-[13px] text-muted">{n} of {of} · {pct}%</span>
      </div>
      <div className="mt-1.5"><Meter value={n} max={of || 1} tone={pct >= 60 ? "teal" : pct >= 30 ? "gold" : "danger"} /></div>
    </div>
  );
}

export default async function ReportsPage() {
  const { user, scope } = await requireCapability("reports:branch");
  const t = scope.tenantId;
  // A consultancy with one office does not need a table comparing it to
  // itself, so this section only appears when there is something to compare.
  const offices = scope.allBranches ? officeBreakdown(scope) : [];

  // The strip an owner decides on: how much work there is, how much of it has
  // stalled, what share ends with a student flying, and which channel does it.
  const stalledFiles = stuckFiles(scope);
  const sources = bySource(scope);
  const counts = stageCounts(scope);
  const flown = counts.departed ?? 0;
  const dropped = counts.lost ?? 0;
  const concluded = flown + dropped;
  const ranked = sources.filter((r) => r.conversion !== null);
  const decide = {
    active: Object.entries(counts)
      .filter(([st]) => st !== "departed" && st !== "lost")
      .reduce((n, [, v]) => n + v, 0),
    newThisMonth: newThisMonth(scope),
    stuck: stalledFiles,
    departed: flown,
    lost: dropped,
    conversion: concluded >= 5 ? Math.round((flown / concluded) * 100) : null,
    bestSource: ranked.length
      ? { label: sourceOf(ranked[0].source).label, conversion: ranked[0].conversion! }
      : null,
  };
  const market = { ...demand(), ...splitMovements() };

  const f = funnel(t);
  const peak = Math.max(1, ...f.map((x) => x.count));
  const load = counsellorLoad(t);
  const stuck = stalled(t);
  const e = engagement(t);
  const countries = byCountry(t);
  const risk = risks(t);
  const active = activeCount(t);
  const departed = f.find((x) => x.stage === "departed")?.count ?? 0;
  const lost = f.find((x) => x.stage === "lost")?.count ?? 0;
  const settled = departed + lost;

  const analytics = branchAnalytics(scope.tenantId);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="display text-[24px]">Reports</h1>
        {/* It said "your own students only" to the owner, who sees every
            office. What the page covers is what the reader's own scope
            covers, so it says which that is. */}
        <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted">
          {scope.see === "all"
            ? "Every office you run."
            : scope.see === "own"
              ? "The students with your name on them."
              : `${user.branchName ?? "Your office"} only.`}
          {" "}Every rate carries the count behind it.
        </p>
      </header>

      {/* ------------------------------------------- the decision strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Active students" value={decide.active} sub={`${decide.newThisMonth} added this month`} />
        <StatTile
          label="Files stopped moving" value={decide.stuck.length}
          tone={decide.stuck.length > 0 ? "danger" : "teal"}
          sub="longer in one stage than your own limit"
        />
        <StatTile
          label="Reached departure" value={decide.conversion === null ? "Not yet" : `${decide.conversion}%`}
          tone={decide.conversion === null ? "grey" : decide.conversion >= 60 ? "teal" : decide.conversion >= 40 ? "gold" : "danger"}
          sub={`${decide.departed} flown, ${decide.lost} lost`}
        />
        <StatTile
          label="Best channel" value={decide.bestSource?.label ?? "Not yet"}
          tone="brand"
          sub={decide.bestSource ? `${decide.bestSource.conversion}% of concluded files` : "needs five concluded files"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Panel
          title="Where your money comes from"
          note="Which channel produces students, not just phone numbers. A rate needs five concluded files before it is shown."
        >
          <div className="scroll-soft overflow-x-auto">
            <table className="w-full min-w-[520px] text-[13.5px]">
              <thead>
                <tr className="border-b border-line bg-wash/60 text-left">
                  {["Source", "Students", "Open", "Flown", "Lost", "Converts"].map((h) => <Th key={h}>{h}</Th>)}
                </tr>
              </thead>
              <tbody>
                {sources.map((r) => (
                  <tr key={r.source} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 font-medium text-ink">{sourceOf(r.source).label}</td>
                    <td className="num px-4 py-2.5 text-ink-2">{r.students}</td>
                    <td className="num px-4 py-2.5 text-ink-2">{r.open}</td>
                    <td className="num px-4 py-2.5 text-teal-700">{r.departed}</td>
                    <td className="num px-4 py-2.5 text-muted">{r.lost}</td>
                    <td className="num px-4 py-2.5">
                      {r.conversion === null
                        ? <span className="text-[12.5px] text-muted">Too few</span>
                        : <span className={`font-medium ${r.conversion >= 60 ? "text-teal-700" : r.conversion >= 40 ? "text-gold-600" : "text-danger-600"}`}>{r.conversion}%</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Files that stopped moving"
          note="Time in the current stage, against the limit this office sets for that stage."
        >
          {decide.stuck.length === 0 ? (
            <p className="px-4 py-6 text-[13.5px] text-muted">Nothing is sitting too long. That is rare, and worth saying.</p>
          ) : (
            <ul className="divide-y divide-line">
              {decide.stuck.slice(0, 8).map((f) => (
                <li key={f.student_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                  <Link href={`/app/pipeline/${f.student_id}`} className="text-[13.5px] font-medium text-brand-600 hover:underline">
                    {f.full_name}
                  </Link>
                  <Chip tone={stageOf(f.stage).tone as Tone}>{stageOf(f.stage).label}</Chip>
                  <span className="text-[12.5px] text-muted">
                    {[f.branch_name, f.counsellor_name ?? "nobody"].filter(Boolean).join(" · ")}
                  </span>
                  <span className="num ml-auto shrink-0 text-[13px] font-medium text-danger-600">
                    {f.days} days
                  </span>
                  <span className="num shrink-0 text-[12px] text-muted">limit {f.limit}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* --------------------------------------------- what the market is doing */}
      <Panel
        title="The market, outside your office"
        note={`Compiled ${shortDate(market.asOf)}.`}
        actions={
          <Link href="/app/market" className="inline-flex min-h-[32px] items-center gap-1 rounded-full px-3 text-[13px] font-medium text-brand-600 hover:bg-brand-50">
            Open the market page <Icon name="arrow" size={15} />
          </Link>
        }
      >
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Rising searches</div>
            <ul className="mt-2 flex flex-col gap-1.5">
              {market.rising.map((k) => (
                <li key={k.term} className="flex items-baseline gap-2 text-[13.5px]">
                  <span className="min-w-0 flex-1 truncate text-ink">{k.term}</span>
                  <span className="num shrink-0 font-medium text-teal-700">+{k.change}%</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Changing soon</div>
            <ul className="mt-2 flex flex-col gap-1.5">
              {market.coming.slice(0, 4).map((m2) => (
                <li key={m2.id} className="flex items-baseline gap-2 text-[13.5px]">
                  <span className="min-w-0 flex-1 truncate text-ink">{m2.headline}</span>
                  <span className="shrink-0 text-[12.5px] text-muted">{shortDate(m2.effectiveOn)}</span>
                </li>
              ))}
              {market.coming.length === 0 && <li className="text-[13px] text-muted">Nothing dated ahead of today.</li>}
            </ul>
          </div>
        </div>
      </Panel>

      {offices.length > 1 && (
        <Panel
          title="Office by office"
          note="The same questions for each of your offices. The number is a link into that office's list."
        >
          <div className="scroll-soft overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13.5px]">
              <thead>
                <tr className="border-b border-line bg-wash/60 text-left">
                  {["Office", "Staff", "Active students", "No counsellor", "Follow-ups late", "Flown out"].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {offices.map((o) => (
                  <tr key={o.id} className="border-b border-line last:border-0 hover:bg-wash/40">
                    <td className="px-4 py-2.5 font-medium text-ink">{o.name}</td>
                    <td className="num px-4 py-2.5 text-ink-2">{o.staff}</td>
                    <td className="num px-4 py-2.5">
                      <Link href={`/app/pipeline?office=${o.id}`} className="font-medium text-brand-600 hover:underline">
                        {o.students}
                      </Link>
                    </td>
                    <td className="num px-4 py-2.5">
                      {o.unassigned > 0
                        ? <Link href={`/app/pipeline?office=${o.id}&unassigned=1`} className="font-medium text-accent-600 hover:underline">{o.unassigned}</Link>
                        : <span className="text-muted">0</span>}
                    </td>
                    <td className="num px-4 py-2.5">
                      {o.late > 0
                        ? <Link href={`/app/pipeline?office=${o.id}&late=1`} className="font-medium text-danger-600 hover:underline">{o.late}</Link>
                        : <span className="text-muted">0</span>}
                    </td>
                    <td className="num px-4 py-2.5 text-ink-2">{o.departed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="h-tight text-[17px]">{offices.length > 1 ? "Everything together" : "How the branch is doing"}</h2>
          <span className="text-[12.5px] text-muted">Last 14 and 30 days</span>
        </div>
        <div className="mt-4">
          <MetricGrid metrics={analytics.headline} />
        </div>
      </section>

      {/* ------------------------------------------- where students fall away */}
      <Card className="p-5">
        <h2 className="h-tight text-[15px]">Where students fall away</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{analytics.funnelReading}</p>
        <ul className="mt-4 flex flex-col gap-1.5">
          {analytics.funnel.map((f) => {
            const widest = Math.max(...analytics.funnel.map((x) => x.count), 1);
            return (
              <li key={f.stage} className="flex items-center gap-3">
                <span className="w-[104px] shrink-0 truncate text-[12.5px] text-ink-2">{f.label}</span>
                <div className="h-5 flex-1 overflow-hidden rounded-md bg-wash">
                  <div
                    className="h-full rounded-md bg-brand-400"
                    style={{ width: `${Math.max(2, (f.count / widest) * 100)}%` }}
                  />
                </div>
                <span className="num w-8 shrink-0 text-right text-[12.5px] font-semibold text-ink">{f.count}</span>
                <span className="w-[76px] shrink-0 text-right text-[11px] text-muted">
                  {f.dropFromPrevious === null
                    ? ""
                    : f.dropFromPrevious > 0
                      ? `−${f.dropFromPrevious}% here`
                      : "no drop"}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* ------------------------------------------------------------ funnel */}
      <Card className="overflow-hidden">
        <div className="border-b border-line bg-wash/60 px-5 py-3">
          <h2 className="h-tight text-[15px]">Where everyone is</h2>
        </div>
        <ul className="divide-y divide-line">
          {f.map((row) => {
            const s = stageOf(row.stage);
            return (
              <li key={row.stage} className="flex items-center gap-4 px-5 py-3">
                <span className="w-32 shrink-0 text-[13.5px] font-medium text-ink">{s.label}</span>
                <div className="flex-1">
                  <div className="h-5 overflow-hidden rounded-md bg-wash">
                    <div
                      className={`h-full rounded-md ${row.stage === "lost" ? "bg-danger-600/70" : row.stage === "departed" ? "bg-teal-500" : "bg-brand-500"}`}
                      style={{ width: `${(row.count / peak) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="num w-8 shrink-0 text-right text-[13.5px] font-semibold text-ink">{row.count}</span>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-line px-5 py-3 text-[12px] text-muted">
          Active stages are {ACTIVE_STAGES.map((s) => stageOf(s).label).join(", ")}. Those are what your plan counts.
        </p>
      </Card>

      {/* -------------------------------------------------------------- risk */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line bg-wash/60 px-5 py-3">
          <h2 className="h-tight text-[15px]">Chase these today</h2>
          <span className="num text-[12px] text-muted">{risk.length}</span>
        </div>
        {risk.length === 0 ? (
          <p className="px-5 py-6 text-center text-[14px] text-muted">Nothing overdue, everyone assigned. Rare and worth enjoying.</p>
        ) : (
          <ul className="divide-y divide-line">
            {risk.slice(0, 12).map((r, i) => (
              <li key={`${r.student_id}-${i}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <Link href={`/app/pipeline/${r.student_id}`} className="text-[14px] font-semibold text-ink hover:text-brand-600">
                    {r.full_name}
                  </Link>
                  <p className="text-[13px] text-ink-2">{r.reason}</p>
                </div>
                <Chip tone={r.severity === "high" ? "danger" : "gold"}>{r.severity === "high" ? "Now" : "Soon"}</Chip>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ----------------------------------------------------------- stalled */}
      <Card className="overflow-hidden">
        <div className="border-b border-line bg-wash/60 px-5 py-3">
          <h2 className="h-tight text-[15px]">Not moved in over a month</h2>
        </div>
        {stuck.length === 0 ? (
          <p className="px-5 py-6 text-center text-[14px] text-muted">Everyone has moved stage within the last 30 days.</p>
        ) : (
          <ul className="divide-y divide-line">
            {stuck.slice(0, 10).map((s) => (
              <li key={s.student_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <Link href={`/app/pipeline/${s.student_id}`} className="text-[14px] font-semibold text-ink hover:text-brand-600">
                    {s.full_name}
                  </Link>
                  <p className="text-[12.5px] text-muted">
                    {stageOf(s.stage).label} · {s.counsellor ?? "unassigned"}
                    {s.lastNote ? ` · last note: ${s.lastNote.slice(0, 70)}` : ""}
                  </p>
                </div>
                <Chip tone={s.days > 60 ? "danger" : "gold"}>{s.days} days</Chip>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* ------------------------------------------------------ counsellors */}
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-wash/60 px-5 py-3">
            <h2 className="h-tight text-[15px]">Who is carrying what</h2>
          </div>
          <div className="scroll-soft overflow-x-auto">
            <table className="w-full min-w-[540px] text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-left">
                  {["Counsellor", "Active", "Departed", "Lost", "Overdue"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.11em] text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {load.map((c) => (
                  <tr key={c.id ?? "none"} className="border-b border-line last:border-0">
                    <td className={`px-4 py-2.5 font-semibold ${c.unassignedFlag ? "text-gold-600" : "text-ink"}`}>{c.name}</td>
                    <td className="num px-4 py-2.5">{c.active}</td>
                    <td className="num px-4 py-2.5">{c.departed}</td>
                    <td className="num px-4 py-2.5">{c.lost}</td>
                    <td className={`num px-4 py-2.5 ${c.overdue ? "font-semibold text-danger-600" : ""}`}>{c.overdue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ScrollHint>Swipe the table sideways to see every column</ScrollHint>
        </Card>

        {/* -------------------------------------------------------- countries */}
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-wash/60 px-5 py-3">
            <h2 className="h-tight text-[15px]">Where they are going</h2>
          </div>
          {countries.length === 0 ? (
            <p className="px-5 py-6 text-center text-[14px] text-muted">No student has chosen a country yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {countries.map((c) => (
                <li key={c.code} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="text-[14px] text-ink">
                    {country(c.code).flag} {country(c.code).name}
                  </span>
                  <span className="flex items-center gap-3">
                    {c.avgBand !== null && <Chip tone="grey">avg band {showBand(c.avgBand)}</Chip>}
                    <span className="num text-[14px] font-semibold text-ink">{c.count}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* -------------------------------------------------------- engagement */}
      <Card className="p-5">
        <h2 className="h-tight text-[15px]">Are they actually using it?</h2>
        <p className="mt-1 text-[13px] text-muted">
          Across {e.students} student{e.students === 1 ? "" : "s"}. Low numbers here are the early
          warning, a student who never opens the practice is a student whose interview will go badly.
        </p>
        {e.students === 0 ? (
          <div className="mt-4"><Empty icon={<Icon name="chart" size={22} />} title="No students yet">Add students to the pipeline and this fills in.</Empty></div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Rate n={e.profileComplete} of={e.students} label="Profile filled in properly" />
            <Rate n={e.didMock} of={e.students} label="Sat at least one mock test" />
            <Rate n={e.didInterview} of={e.students} label="Completed a mock interview" />
            <Rate n={e.wroteSop} of={e.students} label="Started a statement" />
            <Rate n={e.uploadedDocs} of={e.students} label="Uploaded any document" />
            <div className="flex items-end gap-6">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Avg mock band</div>
                <div className="num text-[22px] font-semibold text-ink">{e.avgMockBand ? showBand(e.avgMockBand) : "None yet"}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Avg interview</div>
                <div className="num text-[22px] font-semibold text-ink">{e.avgInterview ?? "None yet"}</div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
