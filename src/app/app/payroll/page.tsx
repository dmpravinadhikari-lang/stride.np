import Link from "next/link";
import { all } from "@/lib/db";
import { requireRole, scopeOf } from "@/lib/auth/current";
import { branchFilter } from "@/lib/db/scope";
import { Button, Card, Chip, inputClass, type Tone } from "@/components/ui";
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

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="display text-[28px]">Payroll</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Run by the Nepali month, because that is when salary is paid. A run is a draft until you
          mark it paid, and then it is locked.
        </p>
      </header>

      <Card className="p-5">
        <h2 className="h-tight text-[16px]">Open a month</h2>
        <form action={startRun} className="mt-3 grid gap-2 sm:grid-cols-4">
          <select name="branch_id" className={inputClass} defaultValue={branches[0]?.id ?? ""}>
            {branches.map((br) => <option key={br.id} value={br.id}>{br.name}</option>)}
          </select>
          <input name="month" defaultValue={lastMonth} className={inputClass} placeholder="2083-03" />
          <select name="calendar" className={inputClass} defaultValue="bs">
            <option value="bs">Nepali month</option>
            <option value="ad">Gregorian month</option>
          </select>
          <Button type="submit">Open run</Button>
        </form>
        <p className="mt-2 text-[12px] text-muted">
          {lastMonth} is {monthLabel(lastMonth, "bs")}, which is usually the month you are paying.
          Opening a run fills in each person&apos;s basic pay and the days they actually clocked.
        </p>
      </Card>

      {runs.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-wash/60 px-5 py-3">
            <h2 className="h-tight text-[15px]">Runs</h2>
          </div>
          <ul className="divide-y divide-line">
            {runs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Link href={`/app/payroll/${r.id}`} className="min-w-0 flex-1 text-[14.5px] font-semibold text-brand-600 hover:underline">
                  {monthLabel(r.month, r.calendar)}
                </Link>
                <span className="shrink-0 text-[12.5px] text-muted">{r.branch_name ?? "unassigned"}</span>
                <Chip tone={(r.status === "paid" ? "teal" : "gold") as Tone}>{r.status}</Chip>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="h-tight text-[16px]">People on payroll</h2>
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
        <form action={savePayrollPerson} className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-3">
          <input name="name" required className={inputClass} placeholder="Name" />
          <input name="position" className={inputClass} placeholder="Position" />
          <input name="monthly_salary" className={inputClass} placeholder="Monthly salary, NPR" />
          <input name="bank_name" className={inputClass} placeholder="Bank" />
          <input name="bank_account" className={inputClass} placeholder="Account number" />
          <select name="pay_scheme" className={inputClass} defaultValue="ssf">
            <option value="ssf">SSF</option>
            <option value="pf">Provident fund</option>
            <option value="none">Neither</option>
          </select>
          <div className="sm:col-span-3"><Button type="submit" variant="secondary">Add to payroll</Button></div>
        </form>
      </Card>
    </div>
  );
}
