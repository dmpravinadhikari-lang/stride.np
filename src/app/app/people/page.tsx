import { all } from "@/lib/db";
import { requireRole, scopeOf } from "@/lib/auth/current";
import { can } from "@/lib/auth/permissions";
import { branchFilter } from "@/lib/db/scope";
import { Button, Card, Chip, inputClass } from "@/components/ui";
import { addExperience, saveEmployee } from "@/modules/payroll/actions";

export const metadata = { title: "People, STRIDE" };

type Person = {
  id: string; full_name: string; email: string; role: string;
  branch_name: string | null;
  position: string | null; joined_on: string | null; phone: string | null;
  employment_type: string | null; salary_band: string | null;
  emergency_name: string | null; emergency_phone: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  full_time: "Full time", part_time: "Part time", contract: "Contract", intern: "Intern",
};

/**
 * The staff list.
 *
 * Deliberately holds a salary band and not a salary. An exact figure sitting
 * in a CRM that every counsellor can reach through some future bug is a
 * liability nobody needs, and a band answers every question a manager actually
 * asks of an HR record. The real numbers live in payroll, behind its own
 * capability.
 */
export default async function PeoplePage() {
  const user = await requireRole("super_admin", "tenant_admin", "counsellor");
  const scope = scopeOf(user);
  const canEdit = can(user.role, "hr:manage");
  const b = branchFilter(scope, "u");

  const people = all<Person>(
    `SELECT u.id, u.full_name, u.email, u.role, br.name AS branch_name,
            e.position, e.joined_on, e.phone, e.employment_type, e.salary_band,
            e.emergency_name, e.emergency_phone
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id
       LEFT JOIN branches br ON br.id = u.branch_id
      WHERE u.tenant_id = ? AND u.role <> 'student' AND u.active = 1${b.sql}
      ORDER BY br.name, u.full_name`,
    scope.tenantId, ...b.params,
  );

  const experience = all<{ user_id: string; organisation: string; role: string | null; started_on: string | null; ended_on: string | null }>(
    `SELECT user_id, organisation, role, started_on, ended_on
       FROM employee_experience WHERE tenant_id = ? ORDER BY started_on DESC`,
    scope.tenantId,
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="display text-[28px]">People</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Your staff, what they do and when they joined. Pay bands rather than figures: the exact
          numbers live in payroll.
        </p>
      </header>

      {people.map((p) => {
        const prior = experience.filter((e) => e.user_id === p.id);
        return (
          <Card key={p.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="h-tight text-[17px]">{p.full_name}</h2>
                  <Chip tone="grey">{p.role.replace("_", " ")}</Chip>
                  {p.employment_type && <Chip tone="brand">{TYPE_LABEL[p.employment_type] ?? p.employment_type}</Chip>}
                  {p.salary_band && <Chip tone="teal">Band {p.salary_band}</Chip>}
                </div>
                <div className="mt-1 text-[12.5px] text-muted">
                  {[p.position, p.branch_name, p.joined_on ? `joined ${p.joined_on}` : null, p.email]
                    .filter(Boolean).join(" · ")}
                </div>
                {p.emergency_name && (
                  <div className="mt-1 text-[12px] text-muted">
                    In an emergency: {p.emergency_name} {p.emergency_phone ?? ""}
                  </div>
                )}
              </div>
            </div>

            {prior.length > 0 && (
              <div className="mt-3 border-t border-line pt-3">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">Before here</div>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {prior.map((e, i) => (
                    <li key={i} className="text-[12.5px] text-ink-2">
                      <span className="font-semibold text-ink">{e.role ?? "Role not recorded"}</span>
                      {" at "}{e.organisation}
                      {e.started_on ? ` · ${e.started_on} to ${e.ended_on ?? "present"}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {canEdit && (
              <details className="mt-3 border-t border-line pt-3">
                <summary className="cursor-pointer text-[13px] font-semibold text-brand-600">Edit details</summary>
                <form action={saveEmployee} className="mt-3 grid gap-2 sm:grid-cols-3">
                  <input type="hidden" name="user_id" value={p.id} />
                  <input name="position" defaultValue={p.position ?? ""} className={inputClass} placeholder="Position" />
                  <input name="joined_on" defaultValue={p.joined_on ?? ""} className={inputClass} placeholder="Joined, YYYY-MM-DD" />
                  <select name="employment_type" defaultValue={p.employment_type ?? "full_time"} className={inputClass}>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input name="phone" defaultValue={p.phone ?? ""} className={inputClass} placeholder="Phone" />
                  <input name="emergency_name" defaultValue={p.emergency_name ?? ""} className={inputClass} placeholder="Emergency contact" />
                  <input name="emergency_phone" defaultValue={p.emergency_phone ?? ""} className={inputClass} placeholder="Emergency phone" />
                  <input name="salary_band" defaultValue={p.salary_band ?? ""} className={inputClass} placeholder="Pay band, e.g. B2" />
                  <div className="sm:col-span-3"><Button type="submit" variant="secondary">Save</Button></div>
                </form>

                <form action={addExperience} className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-4">
                  <input type="hidden" name="user_id" value={p.id} />
                  <input name="organisation" className={inputClass} placeholder="Previous employer" />
                  <input name="role" className={inputClass} placeholder="Their role there" />
                  <input name="started_on" className={inputClass} placeholder="From, YYYY-MM" />
                  <input name="ended_on" className={inputClass} placeholder="To, YYYY-MM" />
                  <div className="sm:col-span-4"><Button type="submit" variant="secondary" size="sm">Add experience</Button></div>
                </form>
              </details>
            )}
          </Card>
        );
      })}
    </div>
  );
}
