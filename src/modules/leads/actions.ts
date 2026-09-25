"use server";

import { revalidatePath } from "next/cache";
import { requireRole, scopeOf } from "@/lib/auth/current";
import { all, one } from "@/lib/db";
import { createLead, getLead, markConverted, updateLead } from "@/modules/leads/data";
import { notify } from "@/lib/email/notify";
import { raiseAlert } from "@/lib/alerts";
import { guard } from "@/lib/security/rate-limit";
import { normaliseSource } from "@/modules/pipeline/sources";

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();

export type WalkInState = { ok: boolean; message?: string };

/**
 * The reception tablet, and the link the office sends.
 *
 * Nobody is signed in when this runs: the student is holding the tablet. So
 * the consultancy is named by slug in the URL, nothing is taken from a
 * session, and the only things that can be written are the enquiry fields.
 * It is rate limited because a public form always is.
 */
export async function submitWalkIn(_prev: WalkInState, formData: FormData): Promise<WalkInState> {
  const limited = await guard("walkIn");
  if (!limited.ok) return { ok: false, message: limited.message };

  const slug = clean(formData.get("slug"));
  const tenant = one<{ id: string }>("SELECT id FROM tenants WHERE slug = ? AND active = 1", slug);
  if (!tenant) return { ok: false, message: "That link is not right. Ask at the desk." };

  const fullName = clean(formData.get("full_name"));
  const phone = clean(formData.get("phone"));
  if (fullName.length < 2) return { ok: false, message: "Please write your name." };
  if (phone.replace(/\D/g, "").length < 7) return { ok: false, message: "Please write a phone number we can reach you on." };

  // An office named in the form, checked against this consultancy. Falls back
  // to head office so a tablet set up in a hurry still files it somewhere.
  const branchId = clean(formData.get("branch_id")) || null;
  const headOffice = () => one<{ id: string }>(
    "SELECT id FROM branches WHERE tenant_id = ? AND active = 1 ORDER BY is_head_office DESC LIMIT 1",
    tenant.id,
  );
  // An office named by the tablet, checked against this consultancy. If it
  // does not resolve the enquiry still has to land somewhere, so it goes to
  // head office rather than being filed against no office at all.
  const branch =
    (branchId ? one<{ id: string }>("SELECT id FROM branches WHERE id = ? AND tenant_id = ?", branchId, tenant.id) : null)
    ?? headOffice();

  const id = createLead({
    tenantId: tenant.id,
    branchId: branch?.id ?? null,
    fullName, phone,
    email: clean(formData.get("email")) || null,
    destination: clean(formData.get("destination")) || null,
    studyLevel: clean(formData.get("study_level")) || null,
    intake: clean(formData.get("intake")) || null,
    englishTest: clean(formData.get("english_test")) || null,
    source: normaliseSource(clean(formData.get("source")))
      || (clean(formData.get("channel")) === "online" ? "website" : "walk_in"),
    note: clean(formData.get("note")) || null,
    channel: clean(formData.get("channel")) === "online" ? "online" : "walk_in",
  });
  if (!id) return { ok: false, message: "Something was missing. Try again, or ask at the desk." };

  // Somebody is standing there. The office should know before they sit down.
  const desk = all<{ id: string }>(
    `SELECT id FROM users
      WHERE tenant_id = ? AND role IN ('counsellor','tenant_admin') AND active = 1
        AND (branch_id = ? OR ? IS NULL)`,
    tenant.id, branch?.id ?? null, branch?.id ?? null,
  );
  for (const person of desk.slice(0, 8)) {
    raiseAlert({ tenantId: tenant.id, branchId: branch?.id ?? null }, {
      userId: person.id,
      kind: "lead.new",
      title: `${fullName} just enquired`,
      body: phone,
      href: "/app/leads",
      dedupeKey: `lead.new:${id}:${person.id}`,
    });
  }

  return { ok: true, message: "Thank you. Somebody will be with you." };
}

/** Picking up an enquiry, or handing it on. */
export async function takeLead(formData: FormData) {
  const user = await requireRole("super_admin", "tenant_admin", "counsellor");
  const scope = scopeOf(user);
  const id = clean(formData.get("id"));
  const ownerId = clean(formData.get("owner_id")) || user.id;
  if (ownerId !== user.id && !one("SELECT 1 FROM users WHERE id = ? AND tenant_id = ? AND role <> 'student'", ownerId, scope.tenantId)) return;

  updateLead(scope, id, { owner_id: ownerId, status: "contacted" });

  if (ownerId !== user.id) {
    const lead = getLead(scope, id);
    if (lead) {
      notify({
        tenantId: scope.tenantId, userId: ownerId, actorId: user.id,
        kind: "student.assigned",
        subject: `Enquiry from ${lead.full_name}`,
        line: `${user.fullName} gave you an enquiry to follow up: ${lead.full_name}, ${lead.phone}.`,
        href: "/app/leads",
        cta: "See the enquiry",
        dedupeKey: `lead.assigned:${id}:${ownerId}`,
      });
    }
  }
  revalidatePath("/app/leads");
}

/** How warm it is, in the counsellor's judgement, and when to ring again. */
export async function setLeadState(formData: FormData) {
  const user = await requireRole("super_admin", "tenant_admin", "counsellor");
  const scope = scopeOf(user);
  const id = clean(formData.get("id"));
  const priority = clean(formData.get("priority"));
  const followUp = clean(formData.get("follow_up_on"));
  const status = clean(formData.get("status"));

  updateLead(scope, id, {
    priority: ["hot", "warm", "cold"].includes(priority) ? priority : null,
    follow_up_on: followUp || null,
    ...(["new", "contacted", "lost"].includes(status) ? { status } : {}),
  });
  revalidatePath("/app/leads");
}

export type ConvertState = { ok: boolean; message?: string; password?: string };

/**
 * Turning an enquiry into a student file.
 *
 * This is where the account is finally made, because this is the first moment
 * an email address is worth asking for: somebody who has decided to go.
 */
export async function convertLead(_prev: ConvertState, formData: FormData): Promise<ConvertState> {
  const user = await requireRole("super_admin", "tenant_admin", "counsellor");
  const scope = scopeOf(user);
  const id = clean(formData.get("id"));
  const lead = getLead(scope, id);
  if (!lead) return { ok: false, message: "That enquiry is not on your board." };
  if (lead.student_id) return { ok: false, message: "This enquiry is already a student." };

  const email = clean(formData.get("email")).toLowerCase() || lead.email || "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, message: "A student account needs an email address. Ask for one before converting." };
  }

  // Reuse the student creation path so a converted enquiry gets exactly what
  // a typed-in student gets: a profile, a pipeline row, an invite.
  const { addStudent } = await import("@/modules/pipeline/actions");
  const made = new FormData();
  made.set("full_name", lead.full_name);
  made.set("email", email);
  made.set("phone", lead.phone);
  made.set("source", lead.source ?? "walk_in");
  made.set("target_country", lead.destination ?? "");
  const result = await addStudent({ ok: true }, made);
  if (!result.ok) return { ok: false, message: result.message };

  const student = one<{ id: string }>("SELECT id FROM users WHERE email = ?", email);
  if (student) markConverted(scope, id, student.id);

  revalidatePath("/app/leads");
  revalidatePath("/app/pipeline");
  return { ok: true, message: result.message, password: result.password };
}
