import { requireRole, scopeOf } from "@/lib/auth/current";
import { Card, Chip, PageHeader, Th, type Tone } from "@/components/ui";
import { localDay, monthStartDay, shortDate, whenText } from "@/lib/dates";
import { Clock } from "@/modules/attendance/Clock";
import { exceptions, hrSummary, openShift, shiftsBetween, workLog } from "@/modules/attendance/data";

export const metadata = { title: "Attendance, OfficeYak" };

const hhmm = (m: number | null) =>
  m == null ? "Still in" : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;

const distance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km away` : `${Math.round(m)} m away`);

/**
 * Attendance.
 *
 * The clock is first, because it is the thing somebody came here to press. The
 * register and the HR report sit underneath for whoever runs the branch, and
 * the branch rule decides whether that means one office or all of them.
 */
export default async function AttendancePage() {
  const user = await requireRole("super_admin", "tenant_admin", "counsellor");
  const scope = scopeOf(user);

  const from = monthStartDay();
  const to = localDay();

  const open = Boolean(openShift(scope));
  const canSeeEveryone = user.role === "tenant_admin" || user.role === "super_admin" || user.isHeadOffice;

  const summary = canSeeEveryone ? hrSummary(scope, from, to) : [];
  const recent = shiftsBetween(scope, from, to).filter(
    (r) => canSeeEveryone || r.user_id === user.id,
  );
  const flagged = canSeeEveryone ? exceptions(scope, from, to) : [];
  const log = workLog(scope, from, to).filter((r) => canSeeEveryone || r.full_name === user.fullName);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Attendance"
        sub="Clock in when you arrive and clock out when you leave. Your location is checked only when you press the button."
      />

      <Clock open={open} branchName={user.branchName} />

      {canSeeEveryone && summary.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-wash/60 px-5 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="h-tight text-[15px]">This month, by person</h2>
              <span className="text-[13px] text-muted">{shortDate(from)} to {shortDate(to)}</span>
            </div>
          </div>
          <div className="scroll-soft overflow-x-auto">
            <table className="w-full min-w-[660px] text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-left">
                  {["Person", "Office", "Days in", "Hours", "Under 8 hours", "Clocked in away"].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {summary.map((p) => (
                  <tr key={p.user_id}>
                    <td className="px-4 py-2.5 font-semibold text-ink">{p.full_name}</td>
                    <td className="px-4 py-2.5 text-muted">{p.branch_name ?? "No office"}</td>
                    <td className="num px-4 py-2.5">{p.days}</td>
                    <td className="num px-4 py-2.5">{hhmm(p.minutes)}</td>
                    <td className="num px-4 py-2.5">
                      {p.short_days > 0
                        ? <Chip tone={"gold" as Tone}>{p.short_days}</Chip>
                        : <span className="text-muted">0</span>}
                    </td>
                    <td className="num px-4 py-2.5">
                      {p.away_days > 0
                        ? <Chip tone={"brand" as Tone}>{p.away_days}</Chip>
                        : <span className="text-muted">0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-5 py-3 text-[12.5px] leading-relaxed text-muted">
            "Clocked in away" means outside the office area, with a reason given. Fine for a fair or a visit.
          </p>
        </Card>
      )}

      {flagged.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-wash/60 px-5 py-3">
            <h2 className="h-tight text-[15px]">Needs a look</h2>
            <p className="mt-0.5 text-[13px] text-muted">
              Clock-ins that were refused, or made away from the office.
            </p>
          </div>
          <ul className="divide-y divide-line">
            {flagged.slice(0, 15).map((e, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-2 px-5 py-2.5">
                <span className="text-[13.5px] font-semibold text-ink">{e.full_name}</span>
                <Chip tone={(e.decision === "denied" ? "danger" : "gold") as Tone}>
                  {e.decision === "denied" ? "Refused" : "Away"}
                </Chip>
                <span className="min-w-0 flex-1 text-[12.5px] text-ink-2">{e.reason ?? ""}</span>
                <span className="shrink-0 text-[12.5px] text-muted">
                  {[e.distance_m != null ? distance(e.distance_m) : null, whenText(localDay(new Date(e.created_at)))].filter(Boolean).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {log.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-wash/60 px-5 py-3">
            <h2 className="h-tight text-[15px]">What the office got done</h2>
            <p className="mt-0.5 text-[13px] text-muted">
              Written by each person as they clock out. Not counted, not ranked.
            </p>
          </div>
          <ul className="divide-y divide-line">
            {log.slice(0, 20).map((r, i) => (
              <li key={i} className="flex flex-wrap gap-x-3 gap-y-1 px-5 py-3">
                <span className="w-[86px] shrink-0 text-[13px] text-muted">{whenText(r.day)}</span>
                <span className="w-[140px] shrink-0 text-[13.5px] font-medium text-ink">{r.full_name}</span>
                <span className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-ink-2">{r.note}</span>
                {canSeeEveryone && r.branch_name && (
                  <span className="shrink-0 text-[12.5px] text-muted">{r.branch_name}</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-line bg-wash/60 px-5 py-3">
          <h2 className="h-tight text-[15px]">{canSeeEveryone ? "Everyone's days this month" : "Your days this month"}</h2>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-6 text-[13.5px] text-muted">
            No days recorded yet this month.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {recent.slice(0, 30).map((r, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                <span className="w-[92px] shrink-0 text-[13px] text-muted">{whenText(r.day)}</span>
                <span className="min-w-0 flex-1 text-[13.5px] text-ink">{r.full_name}</span>
                {r.away > 0 && <Chip tone={"gold" as Tone}>Away</Chip>}
                <span className="num shrink-0 text-[12.5px] text-ink-2">{hhmm(r.minutes)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
