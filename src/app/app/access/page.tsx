import { all } from "@/lib/db";
import { requirePermission, scopeOf } from "@/lib/auth/current";
import { branchFilter } from "@/lib/db/scope";
import { capabilitiesFor, overridesOf, seeFor } from "@/lib/auth/access";
import { POSITIONS, SCOPES, positionOf, defaultPositionFor } from "@/lib/auth/positions";
import { CAPABILITY_GROUPS, CAPABILITIES } from "@/lib/auth/permissions";
import { PageHeader, Panel, Chip, Alert } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { recentAudit } from "@/lib/security/audit";
import { whenText } from "@/lib/dates";
import { PositionForm, ExceptionToggle } from "./controls";

export const metadata = { title: "Who can do what, OfficeYak" };
export const dynamic = "force-dynamic";

/**
 * Who can do what.
 *
 * Built around the job rather than around the checkbox: an owner picks
 * "Front desk" and is finished, because the position already knows that a
 * receptionist writes down walk-ins and never opens a bank statement. The
 * checkboxes are underneath for the cases a job title cannot describe, and
 * each one says plainly whether it follows the position or overrides it.
 */
export default async function AccessPage() {
  const me = await requirePermission("people:permissions");
  const scope = scopeOf(me);
  const b = branchFilter(scope, "u");

  const staff = all<{
    id: string; full_name: string; email: string; role: string;
    position: string | null; data_scope: string | null; branch_name: string | null;
  }>(
    `SELECT u.id, u.full_name, u.email, u.role, u.position, u.data_scope, br.name AS branch_name
       FROM users u LEFT JOIN branches br ON br.id = u.branch_id
      WHERE u.tenant_id = ? AND u.role <> 'student' AND u.active = 1${b.sql}
      ORDER BY br.name, u.full_name`,
    scope.tenantId, ...b.params,
  );

  const trail = recentAudit(me.tenantId, 12, "access.");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Who can do what"
        sub="Give each person the job they actually do. The job decides what they can open."
      />

      <Alert tone="brand" title="The four layers">
        A position carries a set of permissions. An exception granted by name beats the position.
        How far somebody sees, their own files, their office or every office, is set separately.
        The server checks all of it on every screen, so nothing here is only a hidden link.
      </Alert>

      {/* --------------------------------------------------------- the people */}
      <section className="flex flex-col gap-3">
        <h2 className="h-tight text-[17px]">Your staff</h2>
        {staff.map((p) => {
          const positionId = p.position ?? defaultPositionFor(p.role);
          const position = positionOf(positionId);
          const caps = capabilitiesFor({
            id: p.id, role: p.role, position: p.position, dataScope: p.data_scope,
          });
          const exceptions = overridesOf(p.id);
          const sees = seeFor({ id: p.id, role: p.role, position: p.position, dataScope: p.data_scope });

          return (
            <details key={p.id} className="settle group rounded-2xl border border-line bg-panel">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-4">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${position.tint} ${position.ink}`}>
                  <Icon name="user" size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold text-ink">{p.full_name}</span>
                  <span className="block truncate text-[12.5px] text-muted">
                    {p.email}{p.branch_name ? ` · ${p.branch_name}` : ""}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <Chip tone="grey">{position.label}</Chip>
                  <Chip tone={sees === "all" ? "sky" : sees === "office" ? "lilac" : "grey"}>
                    {SCOPES[sees].label}
                  </Chip>
                  {exceptions.length > 0 && (
                    <Chip tone="gold">
                      {exceptions.length} exception{exceptions.length === 1 ? "" : "s"}
                    </Chip>
                  )}
                  <span className="text-[12.5px] tabular-nums text-muted">{caps.size} permissions</span>
                  <Icon name="chevron" size={16} className="text-muted transition-transform group-open:rotate-180" />
                </span>
              </summary>

              <div className="border-t border-line px-5 py-4">
                <PositionForm
                  userId={p.id}
                  name={p.full_name}
                  position={positionId}
                  dataScope={p.data_scope ?? ""}
                  positions={POSITIONS.map((x) => ({ id: x.id, label: x.label, blurb: x.blurb, scope: x.scope }))}
                />

                <h3 className="mt-6 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Exactly what {p.full_name.split(" ")[0]} can do
                </h3>
                <p className="mt-1 text-[12.5px] text-muted">
                  A tick means yes. Change one only when the job title does not describe this person.
                </p>

                <div className="mt-3 flex flex-col gap-4">
                  {CAPABILITY_GROUPS.filter((g) => !g.group.startsWith("Across the whole"))
                    .filter((g) => g.group !== "Their own account")
                    .map((g) => (
                      <div key={g.group}>
                        <div className="text-[12.5px] font-semibold text-ink-2">{g.group}</div>
                        <ul className="mt-1.5 grid gap-1.5 lg:grid-cols-2">
                          {g.caps.map((c) => {
                            const fromPosition = position.grants.includes(c);
                            const exception = exceptions.find((e) => e.perm === c);
                            const state = exception ? (exception.allow === 1 ? "allow" : "deny") : "inherit";
                            return (
                              <li key={c}>
                                <ExceptionToggle
                                  userId={p.id}
                                  perm={c}
                                  label={CAPABILITIES[c]}
                                  fromPosition={fromPosition}
                                  state={state as "inherit" | "allow" | "deny"}
                                />
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                </div>
              </div>
            </details>
          );
        })}
      </section>

      {/* ---------------------------------------------------------- the trail */}
      <Panel
        title="Changes to access"
        note="Every change of position or exception, kept. Nothing in OfficeYak deletes these."
      >
        {trail.length === 0 ? (
          <p className="px-5 py-5 text-[13.5px] text-muted">
            Nothing yet. When somebody's position changes, it is recorded here with who changed it.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {trail.map((t) => (
              <li key={t.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-5 py-2.5">
                <span className="text-[13.5px] text-ink">
                  <span className="font-medium">{t.actor_name ?? "The system"}</span>
                  {" changed "}
                  <span className="font-medium">{t.subject_name ?? "an account"}</span>
                  {": "}{t.detail}
                </span>
                <span className="ml-auto shrink-0 text-[12px] text-muted">
                  {whenText(t.created_at.slice(0, 10))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
