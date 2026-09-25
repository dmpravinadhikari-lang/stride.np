"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/current";
import { queueEmail, flushQueue } from "@/lib/email/queue";
import { ruleById, setRuleEnabled } from "@/lib/email/rules";
import { run } from "@/lib/db";

export type AutomationState = { ok: boolean; message?: string };

/** Switching one automation on or off for this consultancy. */
export async function toggleRule(formData: FormData) {
  const user = await requireRole("super_admin", "tenant_admin");
  const ruleId = String(formData.get("rule_id") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "1";
  setRuleEnabled(user.tenantId, ruleId, enabled);
  revalidatePath("/app/automations");
}

/**
 * Running one automation now, for the person pressing the button.
 *
 * It runs the real rule against real data rather than sending a lorem ipsum
 * sample, because what an owner wants to know is whether the thing that lands
 * in their inbox on Monday is worth having. The dedupe key means pressing it
 * twice in a day changes nothing.
 */
export async function runRuleNow(_prev: AutomationState, formData: FormData): Promise<AutomationState> {
  const user = await requireRole("super_admin", "tenant_admin");
  const rule = ruleById(String(formData.get("rule_id") ?? ""));
  if (!rule) return { ok: false, message: "No such automation." };

  const result = rule.run(user.tenantId, new Date().toISOString().slice(0, 10));
  const posted = await flushQueue(50);
  revalidatePath("/app/automations");

  if (result.queued === 0) {
    return {
      ok: true,
      message: `Nothing to send. ${rule.label} only writes to somebody with something waiting, and today nobody has.`,
    };
  }
  return {
    ok: true,
    message: `${result.queued} message${result.queued === 1 ? "" : "s"} written, ${posted.sent} sent.`,
  };
}

/** A message to yourself, to see what the product's mail looks like on a phone. */
export async function sendTestMail(_prev: AutomationState, _formData: FormData): Promise<AutomationState> {
  const user = await requireRole("super_admin", "tenant_admin");
  queueEmail({
    tenantId: user.tenantId,
    userId: user.id,
    kind: "day.digest",
    subject: "A test from STRIDE",
    body: [
      `${user.fullName.split(" ")[0]},`,
      "",
      "This is a test. Your consultancy's mail is working, and this is what it looks like.",
      "",
      "--",
      "STRIDE",
    ].join("\n"),
    // Stamped, so a second press actually sends a second one.
    dedupeKey: `test:${user.id}:${Date.now()}`,
  });
  const posted = await flushQueue(5);
  revalidatePath("/app/automations");
  return posted.sent > 0
    ? { ok: true, message: `Sent to ${user.email}.` }
    : { ok: false, message: `Written, but not posted: ${"held" in posted ? posted.held : "the mailer refused it"}. It is in the outbox below.` };
}

/** Putting a failed message back in the queue, after fixing whatever broke. */
export async function retryMail(formData: FormData) {
  const user = await requireRole("super_admin", "tenant_admin");
  run(
    "UPDATE notifications SET status = 'queued', attempts = 0, error = NULL WHERE id = ? AND tenant_id = ?",
    String(formData.get("id") ?? ""), user.tenantId,
  );
  await flushQueue(5);
  revalidatePath("/app/automations");
}
