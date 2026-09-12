import Link from "next/link";
import { requireCapability } from "@/lib/auth/guard";
import {
  activeCount, byCountry, counsellorLoad, engagement, funnel, risks, stalled,
} from "@/modules/reports/data";
import { stageOf, ACTIVE_STAGES } from "@/modules/pipeline/stages";
import { country } from "@/lib/countries";
import { showBand } from "@/modules/mock-tests/bands";
import { Card, Chip, Empty, Meter, ScrollHint, StatTile, type Tone } from "@/components/ui";
import { branchAnalytics } from "@/lib/analytics/branch";
import { MetricGrid } from "@/components/MetricCard";

export const metadata = { title: "Reports" };

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
        <h1 className="display text-[28px]">Reports</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          {user.tenantName}. Every figure here is your consultancy's own students and nobody
          else's. Where numbers are small, the count is shown next to the percentage, a rate from
          three students is not a trend.
        </p>
      </header>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="h-tight text-[17px]">How the branch is doing</h2>
          <span className="text-[12px] text-muted">Measured over the last 14 and 30 days</span>
        </div>
        <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-muted">
          Each card says what it is measuring and, where something is off, what usually causes it.
          A rate is always shown with the count behind it, because a percentage of four students
          is not a percentage.
        </p>
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
          <div className="mt-4"><Empty icon="📈" title="No students yet">Add students to the pipeline and this fills in.</Empty></div>
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
                <div className="num text-[22px] font-semibold text-ink">{e.avgMockBand ? showBand(e.avgMockBand) : ", "}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Avg interview</div>
                <div className="num text-[22px] font-semibold text-ink">{e.avgInterview ?? ", "}</div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
