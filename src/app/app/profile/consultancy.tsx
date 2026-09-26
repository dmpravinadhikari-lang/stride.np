"use client";

import { useActionState } from "react";
import { saveConsultancy, type AccountState } from "@/modules/account/actions";
import { Alert, Button, Card, Field, Meter, inputClass } from "@/components/ui";
import { Icon } from "@/components/Icon";

const initial: AccountState = { ok: true };

type Tenant = { name: string; slug: string; plan: string; contact_email: string | null; contact_phone: string | null; address: string | null };

/**
 * The consultancy itself, for whoever runs it.
 *
 * The address is not decoration: it is what goes on a payslip and an invite,
 * so it belongs to somebody rather than to a developer's seed file. The
 * subdomain is shown and not editable, because it is printed on cards and
 * saved in students' browsers already.
 */
export function ConsultancyCard({
  tenant, domain, plan, usage,
}: {
  tenant: Tenant;
  domain: string;
  plan: { label: string; priceNpr: number; maxStudents: number; maxBranches: number; monthlyCredits: number };
  usage: { students: number; offices: number; staff: number; credits: { used: number; allowance: number } };
}) {
  const [state, action, pending] = useActionState(saveConsultancy, initial);
  const cap = (n: number) => (n === Number.POSITIVE_INFINITY ? "Unlimited" : n.toLocaleString("en-US"));
  const tone = (used: number, max: number) =>
    max === Number.POSITIVE_INFINITY ? "teal" : used >= max ? "danger" : used >= max * 0.8 ? "gold" : "teal";

  return (
    <>
      <Card className="p-5">
        <h2 className="h-tight text-[17px]">Your consultancy</h2>
        <p className="mt-1 text-[13.5px] text-muted">
          This name and address appear on invites to students and on payslips.
        </p>
        {state.message && <div className="mt-3"><Alert tone={state.ok ? "teal" : "danger"}>{state.message}</Alert></div>}

        <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Consultancy name" name="org_name">
            <input id="org_name" name="name" required defaultValue={tenant.name} className={inputClass} />
          </Field>
          <Field label="Your address on the internet" name="org_slug" hint="Printed on cards and saved in students' browsers, so it does not change here.">
            <input id="org_slug" value={`${tenant.slug}.${domain}`} readOnly disabled className={`${inputClass} bg-wash text-muted`} />
          </Field>
          <Field label="Contact email" name="org_email" hint="Where students reply when you invite them.">
            <input id="org_email" name="contact_email" type="email" defaultValue={tenant.contact_email ?? ""} className={inputClass} />
          </Field>
          <Field label="Office phone" name="org_phone">
            <input id="org_phone" name="contact_phone" defaultValue={tenant.contact_phone ?? ""} className={inputClass} placeholder="01-xxxxxxx" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address" name="org_address">
              <input id="org_address" name="address" defaultValue={tenant.address ?? ""} className={inputClass} placeholder="Putalisadak, Kathmandu" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="h-tight text-[17px]">What you are using</h2>
          <span className="text-[13px] text-muted">
            {plan.label} plan · NPR {plan.priceNpr.toLocaleString("en-IN")} a month
          </span>
        </div>

        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          {[
            { label: "Active students", used: usage.students, max: plan.maxStudents },
            { label: "Offices", used: usage.offices, max: plan.maxBranches },
            { label: "AI credits this month", used: usage.credits.used, max: usage.credits.allowance },
          ].map((row) => (
            <div key={row.label}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] text-ink-2">{row.label}</span>
                <span className="num text-[13px] text-muted">
                  {row.used.toLocaleString("en-US")} / {cap(row.max)}
                </span>
              </div>
              <div className="mt-2">
                <Meter
                  value={row.max === Number.POSITIVE_INFINITY ? 0 : row.used}
                  max={row.max === Number.POSITIVE_INFINITY ? 1 : row.max}
                  tone={tone(row.used, row.max)}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-[13px] text-muted">
          <Icon name="alert" size={15} className="text-brand-600" />
          Staff accounts are unlimited on every plan. You have {usage.staff}.
          <a
            href="/#pricing"
            className="inline-flex min-h-[32px] items-center rounded-full px-2 font-medium text-brand-600 hover:bg-brand-50"
          >
            See what the other plans include
          </a>
        </p>
      </Card>
    </>
  );
}
