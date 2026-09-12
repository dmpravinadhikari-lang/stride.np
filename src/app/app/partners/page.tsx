import { requireRole, scopeOf } from "@/lib/auth/current";
import { can } from "@/lib/auth/permissions";
import { Card, Chip, inputClass, Button, type Tone } from "@/components/ui";
import {
  partnersForOwner, partnersForStaff, PRIORITY_TIERS, tierOf,
} from "@/modules/partners/data";
import { savePartner } from "@/modules/partners/actions";

export const metadata = { title: "Partners" };

/**
 * The partner institutions.
 *
 * Two versions of this page, decided by one capability. A counsellor sees who
 * to send a student to first. An owner sees that, plus what each institution
 * pays and what it currently owes.
 *
 * The split is done by calling a different reader, not by hiding a column in
 * the markup. A number that never leaves the database cannot leak through a
 * props object or a view-source.
 */
export default async function PartnersPage() {
  const user = await requireRole("super_admin", "tenant_admin", "counsellor");
  const scope = scopeOf(user);
  const seesMoney = can(user.role, "partners:money");
  const canEdit = can(user.role, "partners:manage");

  const partners = seesMoney ? partnersForOwner(scope) : partnersForStaff(scope);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="display text-[28px]">Partners</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          {seesMoney
            ? "The institutions you work with, what each one pays, and the order you want files sent in. Commission is shown to you and to no one else on your team."
            : "The institutions your consultancy works with, in the order files should be sent. Try the ones at the top first."}
        </p>
      </header>

      {partners.length === 0 ? (
        <Card className="p-6">
          <p className="text-[14px] text-muted">
            No partners recorded yet.{" "}
            {canEdit ? "Add the first one below." : "Ask your consultancy admin to add them."}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {PRIORITY_TIERS.map((tier) => {
            const inTier = partners.filter((p) => p.priority === tier.value);
            if (inTier.length === 0) return null;
            return (
              <Card key={tier.value} className="overflow-hidden">
                <div className="border-b border-line bg-wash/60 px-5 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="h-tight text-[15px]">{tier.label}</h2>
                    <span className="text-[12px] text-muted">{tier.blurb}</span>
                  </div>
                </div>
                <ul className="divide-y divide-line">
                  {inTier.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-start gap-3 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-[14.5px] font-semibold text-ink">{p.name}</div>
                        <div className="mt-0.5 text-[12.5px] text-muted">
                          {[p.city, p.country].filter(Boolean).join(", ") || "Location not recorded"}
                          {p.contact_name ? ` · ${p.contact_name}` : ""}
                        </div>
                        {p.priority_note && (
                          <p className="mt-1 text-[12.5px] leading-snug text-ink-2">{p.priority_note}</p>
                        )}
                      </div>
                      {seesMoney && "commission_rate" in p && (
                        <div className="shrink-0 text-right">
                          <div className="num text-[15px] font-semibold text-ink">
                            {p.commission_rate ? `${p.commission_rate}%` : "not agreed"}
                          </div>
                          <div className="text-[10.5px] uppercase tracking-[0.1em] text-muted">
                            of first year
                          </div>
                        </div>
                      )}
                      <Chip tone={(p.status === "active" ? "teal" : "grey") as Tone}>{p.status}</Chip>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}

          {partners.filter((p) => !p.priority).length > 0 && (
            <Card className="overflow-hidden">
              <div className="border-b border-line bg-wash/60 px-5 py-3">
                <h2 className="h-tight text-[15px]">Not ranked yet</h2>
              </div>
              <ul className="divide-y divide-line">
                {partners.filter((p) => !p.priority).map((p) => (
                  <li key={p.id} className="px-5 py-3.5 text-[14.5px] text-ink">{p.name}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {canEdit && (
        <Card className="p-5">
          <h2 className="h-tight text-[16px]">Add a partner</h2>
          <form action={savePartner} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input name="name" required className={inputClass} placeholder="Institution name" />
            <input name="country" className={inputClass} placeholder="Country, e.g. AU" />
            <input name="city" className={inputClass} placeholder="City" />
            <input name="contact_name" className={inputClass} placeholder="Contact person" />
            <input name="contact_email" type="email" className={inputClass} placeholder="Contact email" />
            <select name="priority" className={inputClass} defaultValue="">
              <option value="">Rank later</option>
              {PRIORITY_TIERS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {seesMoney && (
              <>
                <input name="commission_rate" className={inputClass} placeholder="Commission %, e.g. 12" />
                <input name="commission_note" className={inputClass} placeholder="Terms, e.g. paid after census date" />
              </>
            )}

            <div className="sm:col-span-2">
              <Button type="submit">Add partner</Button>
              {seesMoney && (
                <p className="mt-2 text-[12px] text-muted">
                  Commission is visible to you and to other consultancy admins. It never appears on
                  a counsellor&apos;s screen.
                </p>
              )}
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
