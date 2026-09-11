"use server";

import { revalidatePath } from "next/cache";
import { now, run, uid } from "@/lib/db";
import { requireScope } from "@/lib/auth/current";
import { can } from "@/lib/auth/permissions";
import { markPaid, openRun, updateLine } from "@/modules/payroll/data";
import type { Calendar } from "@/modules/payroll/nepali-month";

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const int = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
};

export async function saveEmployee(formData: FormData) {
  const { user, scope } = await requireScope();
  if (!can(user.role, "hr:manage")) return;

  const userId = clean(formData.get("user_id"));
  if (!userId) return;

  run(
    `INSERT INTO employees
       (user_id, tenant_id, branch_id, position, joined_on, date_of_birth, phone,
        address, emergency_name, emergency_phone, employment_type, salary_band, notes, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET
       position=excluded.position, joined_on=excluded.joined_on,
       date_of_birth=excluded.date_of_birth, phone=excluded.phone,
       address=excluded.address, emergency_name=excluded.emergency_name,
       emergency_phone=excluded.emergency_phone, employment_type=excluded.employment_type,
       salary_band=excluded.salary_band, notes=excluded.notes, updated_at=excluded.updated_at`,
    userId, scope.tenantId, scope.branchId ?? null,
    clean(formData.get("position")) || null,
    clean(formData.get("joined_on")) || null,
    clean(formData.get("date_of_birth")) || null,
    clean(formData.get("phone")) || null,
    clean(formData.get("address")) || null,
    clean(formData.get("emergency_name")) || null,
    clean(formData.get("emergency_phone")) || null,
    clean(formData.get("employment_type")) || "full_time",
    // A band, never a figure. The exact salary lives in payroll.
    clean(formData.get("salary_band")) || null,
    clean(formData.get("notes")) || null,
    now(),
  );
  revalidatePath("/app/people");
}

export async function addExperience(formData: FormData) {
  const { user, scope } = await requireScope();
  if (!can(user.role, "hr:manage")) return;
  const userId = clean(formData.get("user_id"));
  const org = clean(formData.get("organisation"));
  if (!userId || org.length < 2) return;

  run(
    `INSERT INTO employee_experience
       (id, user_id, tenant_id, organisation, role, started_on, ended_on, summary, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    uid(), userId, scope.tenantId, org,
    clean(formData.get("role")) || null,
    clean(formData.get("started_on")) || null,
    clean(formData.get("ended_on")) || null,
    clean(formData.get("summary")) || null,
    now(),
  );
  revalidatePath("/app/people");
}

export async function savePayrollPerson(formData: FormData) {
  const { user, scope } = await requireScope();
  if (!can(user.role, "payroll:run")) return;

  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));
  if (name.length < 2) return;

  if (id) {
    run(
      `UPDATE payroll_people SET name=?, position=?, monthly_salary=?, bank_name=?,
              bank_account=?, pan=?, pay_scheme=?, updated_at=?
        WHERE id=? AND tenant_id=?`,
      name, clean(formData.get("position")) || null, int(formData.get("monthly_salary")),
      clean(formData.get("bank_name")) || null, clean(formData.get("bank_account")) || null,
      clean(formData.get("pan")) || null, clean(formData.get("pay_scheme")) || "ssf",
      now(), id, scope.tenantId,
    );
  } else {
    run(
      `INSERT INTO payroll_people
         (id, tenant_id, branch_id, user_id, name, position, monthly_salary,
          bank_name, bank_account, pan, pay_scheme, active, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?)`,
      uid(), scope.tenantId, scope.branchId ?? null,
      clean(formData.get("user_id")) || null, name,
      clean(formData.get("position")) || null, int(formData.get("monthly_salary")),
      clean(formData.get("bank_name")) || null, clean(formData.get("bank_account")) || null,
      clean(formData.get("pan")) || null, clean(formData.get("pay_scheme")) || "ssf",
      now(), now(),
    );
  }
  revalidatePath("/app/payroll");
}

export async function startRun(formData: FormData) {
  const { user, scope } = await requireScope();
  if (!can(user.role, "payroll:run")) return;
  openRun(scope, {
    branchId: clean(formData.get("branch_id")) || scope.branchId || "",
    month: clean(formData.get("month")),
    calendar: (clean(formData.get("calendar")) || "bs") as Calendar,
  });
  revalidatePath("/app/payroll");
}

export async function editLine(formData: FormData) {
  const { user, scope } = await requireScope();
  if (!can(user.role, "payroll:run")) return;
  const runId = clean(formData.get("run_id"));
  updateLine(scope, runId, clean(formData.get("line_id")), {
    basic: int(formData.get("basic")), allowance: int(formData.get("allowance")),
    bonus: int(formData.get("bonus")), ssf: int(formData.get("ssf")),
    pf: int(formData.get("pf")), tds: int(formData.get("tds")),
    cit: int(formData.get("cit")), advance: int(formData.get("advance")),
    other: int(formData.get("other")), other_label: clean(formData.get("other_label")),
  });
  revalidatePath(`/app/payroll/${runId}`);
}

export async function payRun(formData: FormData) {
  const { user, scope } = await requireScope();
  if (!can(user.role, "payroll:run")) return;
  const runId = clean(formData.get("run_id"));
  markPaid(scope, runId);
  revalidatePath(`/app/payroll/${runId}`);
  revalidatePath("/app/payroll");
}
