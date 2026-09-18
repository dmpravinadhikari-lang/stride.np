import Link from "next/link";
import { all } from "@/lib/db";
import { requireRole, scopeOf } from "@/lib/auth/current";
import { branchFilter } from "@/lib/db/scope";
import { Button, Card, Chip, Field, PageHeader, Panel, inputClass, type Tone } from "@/components/ui";
import { peopleFor, runsFor } from "@/modules/payroll/data";
import { currentMonth, monthLabel, previousMonth } from "@/modules/payroll/nepali-month";
import { savePayrollPerson, startRun } from "@/modules/payroll/actions";

export const metadata = { title: "Payroll, STRIDE" };

const npr = (n: number | null) => (n == null ? "not set" : `NPR ${n.toLocaleString("en-IN")}`);

/**
 * Payroll.
 *
 * Runs are keyed to the Nepali month, because that is when salary is paid
 * here. Ashar 2083 ran 15 June to 14 July 2026, so a run labelled July would
 * be a run for no month anybody recognises and the attendance beside each
 * person would be the wrong three weeks.
 */
export default async function PayrollPage() {
  const user = await requireRole("super_admin", "tenant_admin");
  const scope = scopeOf(user);

  const runs = runsFor(scope);
  const people = peopleFor(scope);
  const b = branchFilter(scope);
  const branches = all<{ id: string; name: string }>(
    `SELECT id, name FROM branches WHERE tenant_id = ? AND active = 1${b.sql} ORDER BY name`,
    scope.tenantId, ...b.params,
  );

  const lastMonth = previousMonth(currentMonth("bs"));
  // The month you are paying is almost always the one just gone, so the list
  // runs backwards from this month and stops a year ago.
  const monthChoices = Array.from({ length: 13 }, (_, i) => {
    let m = currentMonth("bs");
    for (let n = 0; n < i; n++) m = previousMonth(m);
    return m;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payroll"
        sub="Paid by the Nepali month. A run stays a draft until you mark it paid, then it locks."
      />

      <Card className="p-5">
        <h2 className="h-tight text-[16px]">Start a pay run</h2>
        <form action={startRun} className="mt-3 grid items-start gap-4 sm:grid-cols-3">
          <Field label="Office" name="run_branch">
            <select id="run_branch" name="branch_id" className={inputClass} defaultValue={branches[0]?.id ?? ""}>
              {branches.map((br) => <option key={br.id} value={br.id}>{br.name}</option>)}
            </select>
          </Field>
          <Field label="Month" name="run_month" hint={`${monthLabel(lastMonth, "bs")} is usually the one you are paying.`}>
            <select id="run_month" name="month" className={inputClass} defaultValue={lastMonth}>
              {monthChoices.map((m) => (
                <option key={m} value={m}>{monthLabel(m, "bs")}</option>
              ))}
            </select>
          </Field>
          <input type="hidden" name="calendar" value="bs" />
          <div className="sm:col-span-3">
            <Button type="submit">Open the run</Button>
          </div>
        </form>
        <p className="mt-3 text-[12.5px] text-muted">
          Opening a run fills in each person&apos;s basic pay and the days they actually clocked.
          Nothing is paid until you say so.
        </p>
      </Card>

      {runs.length > 0 && (
        <Panel title="Pay runs" note="Open one to edit it, line by line.">
          <ul className="divide-y divide-line">
            {runs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Link href={`/app/payroll/${r.id}`} className="inline-flex min-h-[32px] min-w-0 flex-1 items-center text-[14.5px] font-semibold text-brand-600 hover:underline">
                  {monthLabel(r.month, r.calendar)}
                </Link>
                <span className="shrink-0 text-[12.5px] text-muted">{r.branch_name ?? "No office"}</span>
                <Chip tone={(r.status === "paid" ? "teal" : "gold") as Tone}>
                  {r.status === "paid" ? "Paid" : "Draft"}
                </Chip>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Card className="p-5">
        <h2 className="h-tight text-[16px]">People on payroll</h2>
        <p className="mt-0.5 text-[12.5px] text-muted">
          Salary figures live here and nowhere else. The staff list shows a band instead.
        </p>
        {people.length > 0 && (
          <ul className="mt-3 divide-y divide-line">
            {people.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1 text-[14px] text-ink">{p.name}</span>
                <span className="shrink-0 text-[12.5px] text-muted">{p.position ?? ""}</span>
                <Chip tone="grey">{p.pay_scheme.toUpperCase()}</Chip>
                <span className="num shrink-0 text-[13px] font-semibold text-ink">{npr(p.monthly_salary)}</span>
              </li>
            ))}
          </ul>
        )}
        <form action={savePayrollPerson} className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
          <div className="text-[13px] font-semibold text-ink sm:col-span-3">Add someone to payroll</div>
          <Field label="Name" name="pay_name">
            <input id="pay_name" name="name" required className={inputClass} placeholder="Nisha Thapa" />
          </Field>
          <Field label="Position" name="pay_position">
            <input id="pay_position" name="position" className={inputClass} placeholder="Senior counsellor" />
          </Field>
          <Field label="Monthly salary" name="pay_salary" hint="In NPR, before deductions.">
            <input id="pay_salary" name="monthly_salary" inputMode="numeric" className={inputClass} placeholder="52000" />
          </Field>
          <Field label="Bank" name="pay_bank">
            <input id="pay_bank" name="bank_name" className={inputClass} placeholder="NIC Asia" />
          </Field>
          <Field label="Account number" name="pay_account">
            <input id="pay_account" name="bank_account" className={inputClass} placeholder="0123456789" />
          </Field>
          <Field label="Retirement scheme" name="pay_scheme" hint="What is deducted each month.">
            <select id="pay_scheme" name="pay_scheme" className={inputClass} defaultValue="ssf">
              <option value="ssf">SSF</option>
              <option value="pf">Provident fund</option>
              <option value="none">Neither</option>
            </select>
          </Field>
          <div className="sm:col-span-3"><Button type="submit" variant="secondary">Add to payroll</Button></div>
        </form>
      </Card>
    </div>
  );
}
