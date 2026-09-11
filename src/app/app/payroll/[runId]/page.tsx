import { notFound } from "next/navigation";
import { requireRole, scopeOf } from "@/lib/auth/current";
import { Button, Card, Chip, ScrollHint, type Tone } from "@/components/ui";
import { deductions, gross, linesFor, net, runById } from "@/modules/payroll/data";
import { monthLabel, monthRange } from "@/modules/payroll/nepali-month";
import { editLine, payRun } from "@/modules/payroll/actions";

export const metadata = { title: "Pay run, STRIDE" };

const n = (v: number) => v.toLocaleString("en-IN");

export default async function RunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const user = await requireRole("super_admin", "tenant_admin");
  const scope = scopeOf(user);

  const run = runById(scope, runId);
  if (!run) notFound();

  const lines = linesFor(runId);
  const range = monthRange(run.month, run.calendar);
  const draft = run.status === "draft";

  const totals = lines.reduce(
    (a, l) => ({ gross: a.gross + gross(l), ded: a.ded + deductions(l), net: a.net + net(l) }),
    { gross: 0, ded: 0, net: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="display text-[28px]">{monthLabel(run.month, run.calendar)}</h1>
          <Chip tone={(draft ? "gold" : "teal") as Tone}>{run.status}</Chip>
        </div>
        <p className="mt-2 text-[14px] text-ink-2">
          {run.branch_name ?? "Unassigned branch"}
          {range ? ` · ${range.from} to ${range.to}` : ""}
        </p>
        {!draft && (
          <p className="mt-1 text-[12.5px] text-muted">
            Paid on {run.paid_at?.slice(0, 10)}. This run is locked, because a payslip that can be
            edited after it was issued is not a payslip.
          </p>
        )}
      </header>

      <Card className="overflow-hidden">
        <div className="scroll-soft overflow-x-auto">
          <table className="w-full min-w-[940px] text-[13px]">
            <thead>
              <tr className="border-b border-line bg-wash/60 text-left">
                {["Person", "Days", "Basic", "Allow", "Bonus", "SSF", "PF", "TDS", "CIT", "Advance", "Net", ""].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lines.map((l) => (
                <tr key={l.id}>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-ink">{l.name}</div>
                    <div className="text-[11px] text-muted">{l.position ?? ""}</div>
                  </td>
                  <td className="num px-3 py-2 text-[12px]">
                    {l.days_present ?? 0}/{l.days_expected ?? 0}
                    {(l.days_absent ?? 0) > 0 && <span className="ml-1 text-danger-600">-{l.days_absent}</span>}
                  </td>
                  {draft ? (
                    <>
                      {(["basic", "allowance", "bonus", "ssf", "pf", "tds", "cit", "advance"] as const).map((f) => (
                        <td key={f} className="px-1.5 py-2">
                          <form action={editLine}>
                            <input type="hidden" name="run_id" value={runId} />
                            <input type="hidden" name="line_id" value={l.id} />
                            <input
                              name={f} defaultValue={l[f]}
                              aria-label={`${f} for ${l.name}`}
                              className="num w-[74px] rounded-md border border-line bg-panel px-1.5 py-1 text-right text-[12px]"
                            />
                          </form>
                        </td>
                      ))}
                    </>
                  ) : (
                    <>
                      {(["basic", "allowance", "bonus", "ssf", "pf", "tds", "cit", "advance"] as const).map((f) => (
                        <td key={f} className="num px-3 py-2 text-right">{n(l[f])}</td>
                      ))}
                    </>
                  )}
                  <td className="num px-3 py-2 text-right font-semibold text-ink">{n(net(l))}</td>
                  <td className="px-3 py-2" />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line bg-wash/60">
                <td className="px-3 py-2.5 text-[12px] font-semibold text-ink" colSpan={2}>
                  {lines.length} {lines.length === 1 ? "person" : "people"}
                </td>
                <td className="num px-3 py-2.5 text-[12px] text-muted" colSpan={8}>
                  gross {n(totals.gross)} · deductions {n(totals.ded)}
                </td>
                <td className="num px-3 py-2.5 text-right text-[14px] font-bold text-ink">{n(totals.net)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <ScrollHint>Swipe the table sideways to reach every deduction</ScrollHint>
      </Card>

      {draft && lines.length > 0 && (
        <Card className="p-5">
          <h2 className="h-tight text-[16px]">Mark this run paid</h2>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-2">
            Once marked paid nothing on it can change. The attendance figures beside each person
            were copied in when the run was opened, so approving a late clock-in afterwards will
            not alter what this payslip says.
          </p>
          <form action={payRun} className="mt-3">
            <input type="hidden" name="run_id" value={runId} />
            <Button type="submit">Mark paid, NPR {n(totals.net)}</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
