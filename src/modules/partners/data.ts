import { all, one, now, run, uid } from "@/lib/db";
import type { Scope } from "@/lib/db/scope";

/**
 * Partner institutions, applications and what each institution owes.
 *
 * The important rule in this file is that commission never reaches a
 * counsellor. It is enforced three ways, deliberately overlapping:
 *
 *   1. A type. StaffPartner omits the commission fields, so a page that has
 *      one cannot render a number that is not there.
 *   2. A column list. STAFF_COLUMNS is written out rather than SELECT *, so a
 *      commission column added to the table in a year's time does not quietly
 *      start arriving on a counsellor's screen.
 *   3. A capability. Only a role holding "partners:money" can call the owner
 *      readers at all.
 *
 * The reason is not secrecy for its own sake. A counsellor who knows which
 * institution pays best is under quiet pressure to send students there, and
 * the student never learns why. What a counsellor sees instead is a priority
 * the owner sets, which can weigh how fast an institution issues offers and
 * how its students actually do, not only what it pays.
 */

export type Partner = {
  id: string;
  tenant_id: string;
  name: string;
  country: string | null;
  city: string | null;
  website: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  commission_rate: number | null;
  commission_note: string | null;
  priority: number | null;
  priority_note: string | null;
  status: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

/** Everything a counsellor may see. No commission columns, at all, ever. */
export type StaffPartner = Omit<Partner, "commission_rate" | "commission_note">;

export const PRIORITY_TIERS = [
  { value: 1, label: "Send first",  blurb: "Our closest partners. Try these before anything else." },
  { value: 2, label: "Good option", blurb: "Solid, reliable, worth shortlisting." },
  { value: 3, label: "If it fits",  blurb: "Use where the course or the student calls for it." },
  { value: 4, label: "Last resort", blurb: "Only when nothing above works for this student." },
] as const;

export const tierOf = (priority: number | null) =>
  PRIORITY_TIERS.find((t) => t.value === priority) ?? null;

const STAFF_COLUMNS =
  "id, tenant_id, name, country, city, website, contact_name, contact_email, " +
  "contact_phone, priority, priority_note, status, note, created_at, updated_at";

const ORDER = "ORDER BY CASE WHEN priority IS NULL THEN 99 ELSE priority END, name";

/* ---------------------------------------------------------------- staff -- */

export const partnersForStaff = (scope: Scope, country?: string | null): StaffPartner[] =>
  country
    ? all<StaffPartner>(
        `SELECT ${STAFF_COLUMNS} FROM partners
          WHERE tenant_id = ? AND status <> 'ended' AND country = ? ${ORDER}`,
        scope.tenantId, country,
      )
    : all<StaffPartner>(
        `SELECT ${STAFF_COLUMNS} FROM partners
          WHERE tenant_id = ? AND status <> 'ended' ${ORDER}`,
        scope.tenantId,
      );

export const partnerForStaff = (scope: Scope, id: string): StaffPartner | null =>
  one<StaffPartner>(
    `SELECT ${STAFF_COLUMNS} FROM partners WHERE tenant_id = ? AND id = ?`,
    scope.tenantId, id,
  );

/* ---------------------------------------------------------------- owner -- */

/** Never call these from a page a counsellor can open. Guard with "partners:money". */
export const partnersForOwner = (scope: Scope): Partner[] =>
  all<Partner>(`SELECT * FROM partners WHERE tenant_id = ? ${ORDER}`, scope.tenantId);

export const partnerForOwner = (scope: Scope, id: string): Partner | null =>
  one<Partner>("SELECT * FROM partners WHERE tenant_id = ? AND id = ?", scope.tenantId, id);

/* --------------------------------------------------------------- writes -- */

const clean = (v: string | null | undefined) => {
  const s = (v ?? "").trim();
  return s.length ? s : null;
};

export function createPartner(scope: Scope, input: Partial<Partner> & { name: string }): string {
  const id = uid();
  run(
    `INSERT INTO partners
       (id, tenant_id, name, country, city, website, contact_name, contact_email,
        contact_phone, commission_rate, commission_note, priority, priority_note,
        status, note, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id, scope.tenantId, input.name.trim(),
    clean(input.country), clean(input.city), clean(input.website),
    clean(input.contact_name), clean(input.contact_email), clean(input.contact_phone),
    input.commission_rate ?? null, clean(input.commission_note),
    input.priority ?? null, clean(input.priority_note),
    input.status ?? "active", clean(input.note), now(), now(),
  );
  return id;
}

export function updatePartner(scope: Scope, id: string, patch: Partial<Partner>): void {
  const allowed = [
    "name", "country", "city", "website", "contact_name", "contact_email",
    "contact_phone", "commission_rate", "commission_note", "priority",
    "priority_note", "status", "note",
  ] as const;
  const sets: string[] = [];
  const params: Array<string | number | null> = [];
  for (const k of allowed) {
    if (patch[k] === undefined) continue;
    sets.push(`${k} = ?`);
    const v = patch[k];
    params.push(typeof v === "number" ? v : clean(v as string | null));
  }
  if (sets.length === 0) return;
  sets.push("updated_at = ?");
  params.push(now(), scope.tenantId, id);
  run(`UPDATE partners SET ${sets.join(", ")} WHERE tenant_id = ? AND id = ?`, ...params);
}
