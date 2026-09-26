import Link from "next/link";
import { requirePermission, scopeOf } from "@/lib/auth/current";
import { Card, Chip, Empty, PageHeader, StatTile, type Tone } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { BRAND } from "@/lib/brand";
import { shortDate, whenText } from "@/lib/dates";
import { listLeads, leadCounts } from "@/modules/leads/data";
import { officesFor } from "@/modules/pipeline/data";
import { sourceOf } from "@/modules/pipeline/sources";
import { LeadRow } from "./lead-row";

export const metadata = { title: "Enquiries, Stride" };

const PRIORITY: Record<string, { tone: Tone; label: string }> = {
  hot: { tone: "danger", label: "Hot" },
  warm: { tone: "accent", label: "Warm" },
  cold: { tone: "sky", label: "Cold" },
};

/**
 * Enquiries: everybody who has been through the door but is not a student yet.
 *
 * This is the screen the office lives on in the morning, so it opens on what
 * is waiting rather than on a form: who came in, who has not been rung back,
 * and what was promised today.
 */
export default async function LeadsPage({
  searchParams,
}: { searchParams: Promise<{ status?: string; mine?: string; due?: string; office?: string }> }) {
  const { status, mine, due, office } = await searchParams;
  const user = await requirePermission("leads:view");
  const scope = scopeOf(user);

  const rows = listLeads(scope, {
    status, mine: mine === "1", due: due === "1", branchId: office,
  });
  const counts = leadCounts(scope);
  const offices = officesFor(scope);
  const url = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      status, mine: mine === "1" ? "1" : undefined, due: due === "1" ? "1" : undefined, office, ...patch,
    };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/app/leads?${s}` : "/app/leads";
  };

  const chip = (label: string, href: string, on: boolean, tone?: string) => (
    <Link
      href={href}
      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium ${
        on ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line text-ink-2 hover:border-line-2"}`}
    >
      {tone}
      {label}
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Student leads"
        sub="Everybody who has been in touch but is not a student yet. A name and a number is enough to open one."
        actions={
          <Link
            href={`/enquiry/${user.tenantSlug}`}
            target="_blank"
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line-2 bg-panel px-4 text-[13.5px] font-medium text-ink hover:border-brand-400 hover:text-brand-600"
          >
            <Icon name="pin" size={15} /> Open the reception form
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Open enquiries" value={counts.open} sub="not yet a student, not yet lost" />
        <Link href={url({ due: "1", status: undefined })} className="rounded-2xl">
          <StatTile
            label="To ring today" value={counts.dueToday}
            tone={counts.dueToday > 0 ? "danger" : "teal"} sub="promised a call back"
          />
        </Link>
        <StatTile label="Came in today" value={counts.todayNew} tone="brand" sub="across the office" />
        <StatTile label="Became students" value={counts.converted} tone="teal" sub="enquiries that signed up" />
      </div>

      <div className="rounded-2xl border border-line bg-wash px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-ink-2">
          <Icon name="alert" size={15} className="text-brand-600" />
          <span className="font-medium text-ink">Put this on the tablet at reception:</span>
          <code className="rounded-lg border border-line-2 bg-panel px-2.5 py-1 text-[12.5px]">
            {user.tenantSlug}.{BRAND.domain}/enquiry/{user.tenantSlug}
          </code>
          <span className="text-muted">
            It takes a name and a number, needs no login, and lands here the moment they press Done.
          </span>
        </div>
      </div>

      <nav aria-label="Filter enquiries" className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[13px] font-semibold text-muted">Show:</span>
        {chip("Open", url({ status: undefined, mine: undefined, due: undefined }), !status && mine !== "1" && due !== "1")}
        {chip("Mine", url({ mine: mine === "1" ? undefined : "1" }), mine === "1")}
        {chip("To ring today", url({ due: due === "1" ? undefined : "1" }), due === "1")}
        {chip("Converted", url({ status: status === "converted" ? undefined : "converted" }), status === "converted")}
        {chip("Lost", url({ status: status === "lost" ? undefined : "lost" }), status === "lost")}
        {offices.length > 1 && (
          <>
            <span className="ml-3 mr-1 text-[13px] font-semibold text-muted">Office:</span>
            {chip("All", url({ office: undefined }), !office)}
            {offices.map((o) => chip(o.name, url({ office: o.id }), office === o.id))}
          </>
        )}
      </nav>

      {rows.length === 0 ? (
        <Empty
          icon={<Icon name="inbox" size={22} />}
          title={due === "1" ? "Nobody to ring back today" : "No open enquiries"}
        >
          Enquiries arrive from the reception tablet, from the link you send, or when a counsellor
          writes one down.
        </Empty>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {rows.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={{
                  ...lead,
                  sourceLabel: sourceOf(lead.source).label,
                  priorityLabel: lead.priority ? PRIORITY[lead.priority]?.label ?? null : null,
                  when: whenText(lead.created_at.slice(0, 10)),
                  followUpText: lead.follow_up_on ? shortDate(lead.follow_up_on) : null,
                }}
                meId={user.id}
                canConvert
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
