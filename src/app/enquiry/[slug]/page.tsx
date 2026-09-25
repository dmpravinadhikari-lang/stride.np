import { notFound } from "next/navigation";
import { all, one } from "@/lib/db";
import { WalkInForm } from "./form";

/**
 * The reception tablet, and the link the office sends to somebody who cannot
 * come in.
 *
 * Open it once in the morning and it goes back to a blank form after every
 * student. Not indexed and not linked from anywhere: it is not secret, but a
 * walk-in form filled from a bedroom in Butwal is a website enquiry wearing
 * the wrong label, and the reports depend on those two being different.
 */
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function EnquiryPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ online?: string }>;
}) {
  const { slug } = await params;
  const { online } = await searchParams;

  const tenant = one<{ id: string; name: string }>(
    "SELECT id, name FROM tenants WHERE slug = ? AND active = 1", slug,
  );
  if (!tenant) notFound();

  const branches = all<{ id: string; name: string }>(
    "SELECT id, name FROM branches WHERE tenant_id = ? AND active = 1 ORDER BY is_head_office DESC, name",
    tenant.id,
  );

  return (
    <main className="min-h-screen bg-canvas">
      <div className="border-b border-line bg-panel">
        <div className="mx-auto max-w-2xl px-5 py-4">
          <span className="h-tight text-[17px] text-ink">{tenant.name}</span>
        </div>
      </div>
      <WalkInForm
        slug={slug}
        office={branches.length === 1 ? branches[0].name : null}
        branches={branches}
        channel={online === "1" ? "online" : "walk_in"}
      />
    </main>
  );
}
