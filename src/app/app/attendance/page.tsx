import { requireRole, scopeOf } from "@/lib/auth/current";
import { Card, Chip, type Tone } from "@/components/ui";
import { Clock } from "@/modules/attendance/Clock";
import { exceptions, hrSummary, openShift, shiftsBetween } from "@/modules/attendance/data";

export const metadata = { title: "Attendance, STRIDE" };

const hhmm = (m: number | null) =>
  m == null ? "open" : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const todayStr = () => new Date().toISOString().slice(0, 10);

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

  const from = monthStart();
  const to = todayStr();

  const open = Boolean(openShift(scope));
  const canSeeEveryone = user.role === "tenant_admin" || user.role === "super_admin" || user.isHeadOffice;

  const summary = canSeeEveryone ? hrSummary(scope, from, to) : [];
  const recent = shiftsBetween(scope, from, to).filter(
    (r) => canSeeEveryone || r.user_id === user.id,
  );
  const flagged = canSeeEveryone ? exceptions(scope, from, to) : [];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="display text-[28px]">Attendance</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Signing in is not attendance. Clocking in is the deliberate act that starts a working
          day, and it is the only thing that asks where you are.
        </p>
      </header>

      <Clock open={open} branchName={user.branchName} />

      {canSeeEveryone && summary.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-wash/60 px-5 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="h-tight text-[15px]">This month, by person</h2>
              <span className="num text-[12px] text-muted">{from} to {to}</span>
            </div>
          </div>
          <div className="scroll-soft overflow-x-auto">
            <table className="w-full min-w-[660px] text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-left">
                  {["Person", "Branch", "Days", "Hours", "Short days", "Away from office"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.11em] text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {summary.map((p) => (
                  <tr key={p.user_id}>
                    <td className="px-4 py-2.5 font-semibold text-ink">{p.full_name}</td>
                    <td className="px-4 py-2.5 text-muted">{p.branch_name ?? "unassigned"}</td>
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
          <p className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-muted">
            A short day is under eight hours. Away from office counts days somebody clocked in from
            outside the branch radius with a reason, which is normal for a fair or a partner visit
            and worth a conversation when it is every day.
          </p>
        </Card>
      )}

      {flagged.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-wash/60 px-5 py-3">
            <h2 className="h-tight text-[15px]">Worth a look</h2>
            <p className="mt-0.5 text-[12px] text-muted">
              Refused attempts, and clock-ins from away with the reason given.
            </p>
          </div>
          <ul className="divide-y divide-line">
            {flagged.slice(0, 15).map((e, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-2 px-5 py-2.5">
                <span className="text-[13.5px] font-semibold text-ink">{e.full_name}</span>
                <Chip tone={(e.decision === "denied" ? "danger" : "gold") as Tone}>
                  {e.decision === "denied" ? "refused" : "away"}
                </Chip>
                <span className="min-w-0 flex-1 text-[12.5px] text-ink-2">{e.reason ?? ""}</span>
                <span className="num shrink-0 text-[11.5px] text-muted">
                  {e.distance_m != null ? `${e.distance_m} m` : ""} {e.created_at.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-line bg-wash/60 px-5 py-3">
          <h2 className="h-tight text-[15px]">{canSeeEveryone ? "Every shift this month" : "Your shifts this month"}</h2>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-6 text-[13.5px] text-muted">
            Nothing clocked yet this month.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {recent.slice(0, 30).map((r, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                <span className="num w-[92px] shrink-0 text-[12.5px] text-muted">{r.day}</span>
                <span className="min-w-0 flex-1 text-[13.5px] text-ink">{r.full_name}</span>
                {r.away > 0 && <Chip tone={"gold" as Tone}>away</Chip>}
                <span className="num shrink-0 text-[12.5px] text-ink-2">{hhmm(r.minutes)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
