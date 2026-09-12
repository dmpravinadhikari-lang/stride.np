import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { linkByToken, recordView } from "@/modules/parents/data";
import { buildSummary } from "@/modules/parents/summary";
import { isUnlocked } from "@/modules/parents/unlock";
import { CodeGate } from "./gate";
import { currentBrand } from "@/lib/tenancy/branch";
import { ProgressPage } from "./progress";

// A parent's progress page must never turn up in a search result.
export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ParentPortal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = linkByToken(token);
  if (!link) notFound();

  if (!(await isUnlocked(link.id, Boolean(link.code_hash)))) {
    // Only the greeting name crosses to the locked page. Everything else
    // about this link stays on the server until the code is right.
    return (
      <CodeGate
        token={token}
        firstName={link.parent_name.split(" ")[0]}
        brand={await currentBrand()}
      />
    );
  }

  const summary = buildSummary(link.tenant_id, link.student_id);
  if (!summary) notFound();

  recordView(link.id);
  return <ProgressPage summary={summary} greetingName={link.parent_name} relation={link.relation} />;
}
