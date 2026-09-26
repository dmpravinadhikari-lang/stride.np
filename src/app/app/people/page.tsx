import { all } from "@/lib/db";
import { requirePermission, scopeOf } from "@/lib/auth/current";
import { can } from "@/lib/auth/access";
import { branchFilter } from "@/lib/db/scope";
import { Button, Card, Chip, Field, PageHeader, inputClass } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ROLE_LABEL, type Role } from "@/lib/auth/roles";
import { shortDate } from "@/lib/dates";
import { addTeam } from "@/modules/staff/actions";
import { AddStaff } from "./add-staff";
import { addExperience, saveEmployee } from "@/modules/payroll/actions";

export const metadata = { title: "Staff, Stride" };

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
  const user = await requirePermission("hr:view");
  const scope = scopeOf(user);
  const canEdit = can(user, "hr:manage");
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

  const branches = all<{ id: string; name: string }>(
    "SELECT id, name FROM branches WHERE tenant_id = ? AND active = 1 ORDER BY is_head_office DESC, name",
    scope.tenantId,
  );
  const teams = all<{ id: string; name: string; branch_name: string | null; members: string | null }>(
    `SELECT t.id, t.name, br.name AS branch_name,
            (SELECT GROUP_CONCAT(u.full_name, ', ') FROM team_members m JOIN users u ON u.id = m.user_id WHERE m.team_id = t.id) AS members
       FROM teams t LEFT JOIN branches br ON br.id = t.branch_id
      WHERE t.tenant_id = ?${branchFilter(scope, "t").sql}
      ORDER BY t.name`,
    scope.tenantId, ...branchFilter(scope, "t").params,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Staff"
        sub="Everyone who works here, their role and their office. Pay is shown as a band; exact figures stay in Payroll."
      />

      {canEdit && <AddStaff branches={branches} />}

      <section className="flex flex-col gap-3">
        <h2 className="h-tight text-[17px]">{people.length} {people.length === 1 ? "person" : "people"}</h2>
      {people.map((p) => {
        const prior = experience.filter((e) => e.user_id === p.id);
        return (
          <Card key={p.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="h-tight text-[17px]">{p.full_name}</h3>
                  <Chip tone="grey">{ROLE_LABEL[p.role as Role] ?? p.role}</Chip>
                  {p.employment_type && <Chip tone="brand">{TYPE_LABEL[p.employment_type] ?? p.employment_type}</Chip>}
                  {p.salary_band && <Chip tone="teal">Band {p.salary_band}</Chip>}
                </div>
                <div className="mt-1 text-[13px] text-muted">
                  {[p.position, p.branch_name, p.joined_on ? `Joined ${shortDate(p.joined_on)}` : null, p.email]
                    .filter(Boolean).join(" · ")}
                </div>
                {p.emergency_name && (
                  <div className="mt-1 text-[12.5px] text-muted">
                    In an emergency: {p.emergency_name} {p.emergency_phone ?? ""}
                  </div>
                )}
              </div>
            </div>

            {prior.length > 0 && (
              <div className="mt-3 border-t border-line pt-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Worked before at</div>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {prior.map((e, i) => (
                    <li key={i} className="text-[13px] text-ink-2">
                      <span className="font-semibold text-ink">{e.role ?? "Role not recorded"}</span>
                      {" at "}{e.organisation}
                      {e.started_on ? ` · ${e.started_on} to ${e.ended_on ?? "now"}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {canEdit && (
              <details className="mt-3 border-t border-line pt-3">
                <summary className="inline-flex min-h-[36px] items-center text-[13px] font-semibold text-brand-600">Edit details</summary>
                <form action={saveEmployee} className="mt-3 grid gap-3 sm:grid-cols-3">
                  <input type="hidden" name="user_id" value={p.id} />
                  <Field label="Position" name={`pos-${p.id}`}>
                    <input id={`pos-${p.id}`} name="position" defaultValue={p.position ?? ""} className={inputClass} placeholder="Senior counsellor" />
                  </Field>
                  <Field label="Joined on" name={`joined-${p.id}`}>
                    <input id={`joined-${p.id}`} type="date" name="joined_on" defaultValue={p.joined_on ?? ""} className={inputClass} />
                  </Field>
                  <Field label="Type" name={`type-${p.id}`}>
                    <select id={`type-${p.id}`} name="employment_type" defaultValue={p.employment_type ?? "full_time"} className={inputClass}>
                      {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Phone" name={`phone-${p.id}`}>
                    <input id={`phone-${p.id}`} name="phone" defaultValue={p.phone ?? ""} className={inputClass} placeholder="98xxxxxxxx" />
                  </Field>
                  <Field label="Emergency contact" name={`em-${p.id}`}>
                    <input id={`em-${p.id}`} name="emergency_name" defaultValue={p.emergency_name ?? ""} className={inputClass} placeholder="Name" />
                  </Field>
                  <Field label="Emergency phone" name={`emp-${p.id}`}>
                    <input id={`emp-${p.id}`} name="emergency_phone" defaultValue={p.emergency_phone ?? ""} className={inputClass} placeholder="98xxxxxxxx" />
                  </Field>
                  <Field label="Pay band" name={`band-${p.id}`} hint="A band like B2, not a salary.">
                    <input id={`band-${p.id}`} name="salary_band" defaultValue={p.salary_band ?? ""} className={inputClass} placeholder="B2" />
                  </Field>
                  <div className="sm:col-span-3"><Button type="submit" variant="secondary">Save details</Button></div>
                </form>

                <form action={addExperience} className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-4">
                  <input type="hidden" name="user_id" value={p.id} />
                  <div className="text-[13px] font-semibold text-ink sm:col-span-4">Add previous work</div>
                  <Field label="Employer" name={`org-${p.id}`}>
                    <input id={`org-${p.id}`} name="organisation" required className={inputClass} placeholder="ABC Education" />
                  </Field>
                  <Field label="Their role" name={`role-${p.id}`}>
                    <input id={`role-${p.id}`} name="role" className={inputClass} placeholder="Counsellor" />
                  </Field>
                  <Field label="From" name={`from-${p.id}`}>
                    <input id={`from-${p.id}`} type="month" name="started_on" className={inputClass} />
                  </Field>
                  <Field label="To" name={`to-${p.id}`} hint="Leave empty if still there.">
                    <input id={`to-${p.id}`} type="month" name="ended_on" className={inputClass} />
                  </Field>
                  <div className="sm:col-span-4"><Button type="submit" variant="secondary" size="sm">Add work</Button></div>
                </form>
              </details>
            )}
          </Card>
        );
      })}
      </section>

      <section id="teams" className="flex flex-col gap-3 scroll-mt-6">
        <h2 className="h-tight text-[17px]">Teams</h2>
        <p className="-mt-1 text-[14px] text-muted">A team is a desk, like "Visa desk". Tasks given to a team can be picked up by anyone in it.</p>
        {teams.length > 0 && (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {teams.map((t) => (
                <li key={t.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-5 py-3">
                  <span className="text-[14.5px] font-semibold text-ink">{t.name}</span>
                  {t.branch_name && <span className="text-[12.5px] text-muted">{t.branch_name}</span>}
                  <span className="min-w-0 flex-1 text-right text-[13px] text-ink-2">{t.members ?? "No members yet"}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {canEdit && (
          <Card className="p-5">
            <form action={addTeam} className="grid gap-4 sm:grid-cols-2">
              <Field label="Team name" name="team_name">
                <input id="team_name" name="name" required className={inputClass} placeholder="Visa desk" />
              </Field>
              <Field label="Office" name="team_branch">
                <select id="team_branch" name="branch_id" className={inputClass} defaultValue={branches[0]?.id ?? ""}>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </Field>
              <fieldset className="sm:col-span-2">
                <legend className="text-[13px] font-semibold text-ink">Who is in it</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {people.map((p) => (
                    <label key={p.id} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line-2 px-3.5 text-[13.5px] text-ink-2 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500">
                      <input type="checkbox" name="member_id" value={p.id} className="h-[18px] w-[18px] accent-[var(--color-brand-500)]" />
                      {p.full_name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="sm:col-span-2"><Button type="submit"><Icon name="plus" size={16} /> Create team</Button></div>
            </form>
          </Card>
        )}
      </section>
    </div>
  );
}
