import { NextResponse } from "next/server";
import { one } from "@/lib/db";
import { queueEmail, flushQueue } from "@/lib/email/queue";
import { generateDraft } from "@/modules/blog/generate";
import { saveDraft } from "@/modules/blog/save";
import { markTopic, nextTopic } from "@/modules/blog/topics";
import { BRAND } from "@/lib/brand";

/**
 * The scheduled draft writer.
 *
 * It writes a draft and emails the owner. It does NOT publish. A guide about
 * visa thresholds that nobody read before it went live is how a family ends up
 * at the bank with the wrong number, and how a domain gets marked down for
 * unreviewed machine content. The approval step is the point of the feature.
 *
 * On the server, every third day:
 *   0 7 *\/3 * *  curl -fsS -H "Authorization: Bearer $STRIDE_CRON_SECRET" \
 *                   http://127.0.0.1:3000/api/cron/blog
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.STRIDE_CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || given !== secret) return new NextResponse("Not authorised", { status: 401 });

  const topic = nextTopic();
  if (!topic) {
    return NextResponse.json({ ok: true, wrote: null, reason: "Topic queue is empty, add topics in the admin console." });
  }

  const owner = one<{ id: string; tenant_id: string }>(
    "SELECT id, tenant_id FROM users WHERE role = 'super_admin' ORDER BY created_at LIMIT 1",
  );
  if (!owner) {
    return NextResponse.json({ ok: false, reason: "No platform owner account to attribute this to." }, { status: 500 });
  }
  // A system job, not a person at a desk. It belongs to no branch and is not
  // confined to one.
  const scope = {
    tenantId: owner.tenant_id, userId: owner.id, role: "super_admin" as const,
    branchId: null, allBranches: true,
  };

  let slug: string;
  try {
    const draft = await generateDraft(scope, topic);
    if (!draft.title || draft.markdown.length < 600) {
      return NextResponse.json(
        { ok: false, reason: "Generator returned nothing usable; topic left queued." },
        { status: 502 },
      );
    }
    slug = saveDraft(draft);
    markTopic(topic.id, "drafted");
  } catch (error) {
    return NextResponse.json(
      { ok: false, reason: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }

  queueEmail({
    tenantId: owner.tenant_id, userId: owner.id, kind: "blog-draft",
    subject: `A draft is ready to review: ${topic.title}`,
    body: [
      "A new guide has been drafted and is waiting for you.",
      "",
      `Topic: ${topic.title}`,
      `Angle: ${topic.angle}`,
      "",
      "Nothing is public until you approve it. Read it, correct any figure you are not",
      "certain of, then publish it or schedule it for a date.",
      "",
      `Review: ${BRAND.domain}/app/admin/blog/${slug}`,
      "",
      `,  ${BRAND.name}`,
    ].join("\n"),
    dedupeKey: `blog-draft:${slug}`,
  });
  const flushed = await flushQueue(5);

  return NextResponse.json({ ok: true, wrote: slug, topic: topic.title, emailed: flushed });
}
