import { requireCapability } from "@/lib/auth/guard";
import { requireUser, scopeOf } from "@/lib/auth/current";
import { Card, Chip, Empty, PageHeader, ScrollHint, Th, inputClass } from "@/components/ui";
import { Kpi, NavyCard } from "@/components/brand-ui";
import { Icon } from "@/components/Icon";
import {
  commissionSummary, uninvoicedPlacements, COMMISSION_STATUSES,
} from "@/modules/partners/commission";
import { addCommission, moveCommission, removeCommission } from "./actions";

export const metadata = { title: "Money coming in, OfficeYak" };

/**
 * What the institutions owe, and whether it has arrived.
 *
 * Payroll answered where the money goes. Nothing answered where it comes
 * from, which is the half a consultancy is actually run on: commission is
 * earned when a student is placed and lands months later, and an office that
 * cannot see that gap spends against money it has not got.
 *
 * The page is built around one question and answers it in the first line:
 * how much are we owed, and how much of it is late.
 */
export default async function MoneyPage() {
  await requireCapability("money:view");
  const user = await requireUser();
  const scope = scopeOf(user);

  const s = commissionSummary(scope);
  const candidates = uninvoicedPlacements(scope);
  const npr = (n: number) => `NPR ${n.toLocaleString("en-IN")}`;

  const STATUS_TONE = {
    expected: "grey", invoiced: "gold", received: "teal", written_off: "danger",
  } as const;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Money coming in"
        sub="What the institutions owe you for the students you placed, and whether it has arrived."
      />

      {/*
        The headline is not total commission. It is what is outstanding, split
        by whether you have asked for it yet, because those are two different
        problems: one is waiting, the other is a phone call you have not made.
      */}
      <NavyCard decoration="ridge">
        <div className="grid gap-8 sm:grid-cols-3">
          <Kpi
            tone="dark" peak="grow" size={32}
            value={npr(s.expected.npr + s.invoiced.npr)}
            label="Outstanding"
            sub={`${s.expected.count + s.invoiced.count} placements not yet paid`}
          />
          <Kpi
            tone="dark" peak="prepare" size={32}
            value={npr(s.overdue.npr)}
            label="Invoiced over 60 days ago"
            sub={s.overdue.count === 0 ? "nothing is late" : `${s.overdue.count} worth chasing today`}
          />
          <Kpi
            tone="dark" peak="run" size={32}
            value={npr(s.received.npr)}
            label="Received"
            sub={
              s.shortfallPct > 0
                ? `${s.shortfallPct}% less than agreed, across all partners`
                : `${s.received.count} paid in full`
            }
          />
        </div>
      </NavyCard>

      {s.shortfallPct >= 5 && (
        <Card className="border-l-4 border-l-accent-500 p-5">
          <h2 className="h-tight text-[15px]">Partners are paying {s.shortfallPct}% less than agreed</h2>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
            Across everything marked received, the money that arrived is {s.shortfallPct}% below what the
            rate said it would be. A point or two is scholarships reducing the tuition it was calculated
            on. More than that is usually a deduction in the agreement nobody has read recently, and it is
            worth asking a partner to itemise one payment.
          </p>
        </Card>
      )}

      {/* ------------------------------------------- placements not recorded */}
      {candidates.length > 0 && (
        <section>
          <h2 className="h-tight text-[17px]">
            {candidates.length === 1 ? "One placement with no commission recorded" : `${candidates.length} placements with no commission recorded`}
          </h2>
          <p className="mt-1 max-w-3xl text-[13.5px] leading-relaxed text-ink-2">
            These students were accepted and nobody has written down what the institution owes for them.
            The figure is worked out from the partner&apos;s agreed rate and the tuition on the application;
            change it if the agreement says something different.
          </p>

          <div className="mt-3 flex flex-col gap-3">
            {candidates.slice(0, 12).map((c) => (
              <form
                key={c.application_id} action={addCommission}
                className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-panel p-4"
              >
                <input type="hidden" name="application_id" value={c.application_id} />
                <input type="hidden" name="student_id" value={c.student_id} />
                <input type="hidden" name="partner_id" value={c.partner_id ?? ""} />

                <div className="min-w-[200px] flex-1">
                  <div className="text-[14.5px] font-semibold text-ink">{c.student_name}</div>
                  <div className="text-[12.5px] text-muted">
                    {c.institution}
                    {c.intake ? ` · ${c.intake}` : ""}
                    {c.commission_rate ? ` · ${c.commission_rate}% agreed` : " · no rate agreed yet"}
                  </div>
                </div>

                <div>
                  <label htmlFor={`e-${c.application_id}`} className="block text-[12px] font-medium text-muted">
                    Commission, NPR
                  </label>
                  <input
                    id={`e-${c.application_id}`} name="expected_npr" inputMode="numeric"
                    defaultValue={c.suggested_npr || ""}
                    placeholder={c.tuition_npr ? "" : "tuition not recorded"}
                    className={`${inputClass} mt-1 w-[150px]`}
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] bg-ink px-4 text-[13.5px] font-semibold text-white hover:bg-ink-2"
                >
                  <Icon name="plus" size={15} /> Record
                </button>
              </form>
            ))}
            {candidates.length > 12 && (
              <p className="text-[12.5px] text-muted">
                {candidates.length - 12} more once these are recorded.
              </p>
            )}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------ the ledger */}
      <section>
        <h2 className="h-tight text-[17px]">Every commission</h2>
        {s.rows.length === 0 ? (
          <Empty icon={<Icon name="wallet" size={22} />} title="Nothing recorded yet">
            Commission appears here once a student&apos;s application is marked accepted and you record
            what the institution owes. Set a rate against each partner first and the figure is worked
            out for you.
          </Empty>
        ) : (
          <Card className="mt-3 overflow-hidden">
            <div className="scroll-soft overflow-x-auto">
              <table className="w-full min-w-[760px] text-[13.5px]">
                <thead>
                  <tr className="border-b border-line bg-wash text-left">
                    {["Student", "Institution", "Expected", "Received", "Stage", ""].map((h) => (
                      <Th key={h}>{h}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {s.rows.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 font-semibold text-ink">{c.student_name ?? "Not linked"}</td>
                      <td className="px-4 py-3 text-ink-2">
                        {c.institution ?? c.partner_name ?? "Not linked"}
                        {c.intake && <span className="block text-[12px] text-muted">{c.intake}</span>}
                      </td>
                      <td className="mono px-4 py-3 text-ink">{npr(c.expected_npr)}</td>
                      <td className="mono px-4 py-3">
                        {c.received_npr !== null ? (
                          <span className={c.received_npr < c.expected_npr ? "text-danger-600" : "text-teal-700"}>
                            {npr(c.received_npr)}
                          </span>
                        ) : (
                          <span className="text-muted">·</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Chip tone={STATUS_TONE[c.status]}>
                          {COMMISSION_STATUSES.find((x) => x.id === c.status)?.label ?? c.status}
                        </Chip>
                        {c.invoiced_on && c.status === "invoiced" && (
                          <span className="mt-0.5 block text-[11.5px] text-muted">since {c.invoiced_on}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {c.status === "expected" && (
                            <form action={moveCommission}>
                              <input type="hidden" name="id" value={c.id} />
                              <input type="hidden" name="status" value="invoiced" />
                              <button type="submit" className="rounded-[10px] border border-line-2 px-2.5 py-1 text-[12px] font-semibold text-ink-2 hover:border-brand-400 hover:text-brand-600">
                                Invoiced
                              </button>
                            </form>
                          )}
                          {(c.status === "expected" || c.status === "invoiced") && (
                            <>
                              <form action={moveCommission} className="flex items-center gap-1">
                                <input type="hidden" name="id" value={c.id} />
                                <input type="hidden" name="status" value="received" />
                                <label htmlFor={`r-${c.id}`} className="sr-only">Amount received</label>
                                <input
                                  id={`r-${c.id}`} name="received_npr" inputMode="numeric"
                                  placeholder={String(c.expected_npr)}
                                  className="min-h-[32px] w-[104px] rounded-lg border border-line-2 px-2 text-[12.5px]"
                                />
                                <button type="submit" className="rounded-[10px] bg-brand-500 px-2.5 py-1 text-[12px] font-semibold text-ink hover:bg-brand-400">
                                  Received
                                </button>
                              </form>
                              <form action={moveCommission}>
                                <input type="hidden" name="id" value={c.id} />
                                <input type="hidden" name="status" value="written_off" />
                                <button type="submit" className="px-2 py-1 text-[12px] font-medium text-muted hover:text-danger-600">
                                  Write off
                                </button>
                              </form>
                            </>
                          )}
                          {c.status === "received" && (
                            <form action={removeCommission}>
                              <input type="hidden" name="id" value={c.id} />
                              <button type="submit" className="px-2 py-1 text-[12px] font-medium text-muted hover:text-danger-600">
                                Remove
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ScrollHint>Swipe the table sideways to record a payment</ScrollHint>
          </Card>
        )}
      </section>

      <p className="max-w-3xl text-[12.5px] leading-relaxed text-muted">
        Only people whose job includes money can open this page, and a counsellor never can. A counsellor
        who knows which institution pays best has been given a reason to recommend it.
      </p>
    </div>
  );
}
