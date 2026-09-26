"use server";

import { revalidatePath } from "next/cache";
import { sendInvite } from "@/lib/crm/invite";
import { logActivity } from "@/lib/crm/activity";
import { notify } from "@/lib/email/notify";
import { randomBytes } from "node:crypto";
import { requireRole, scopeOf } from "@/lib/auth/current";
import { hashPassword } from "@/lib/auth/password";
import { now, one, run, uid } from "@/lib/db";
import { planOf } from "@/lib/plans";
import { ensureProfile, saveProfile } from "@/lib/profile";
import {
  activeStudentCount, addNote, canView, ensureEntry, getPipelineRow, updateEntry,
} from "@/modules/pipeline/data";
import { stageOf } from "@/modules/pipeline/stages";

export type PipelineState = { ok: boolean; message?: string; password?: string };

const STAFF = ["super_admin", "tenant_admin", "counsellor"] as const;
const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();

/** Readable but not guessable. The counsellor reads it out to the student once. */
function tempPassword(): string {
  const words = ["himal", "chautari", "sagar", "gurans", "makalu", "bagmati", "pokhara", "annapurna"];
  const word = words[randomBytes(1)[0] % words.length];
  return `${word}-${randomBytes(2).toString("hex")}`;
}

export async function addStudent(_prev: PipelineState, formData: FormData): Promise<PipelineState> {
  const user = await requireRole(...STAFF);
  const scope = scopeOf(user);

  const fullName = clean(formData.get("full_name"));
  const email = clean(formData.get("email")).toLowerCase();
  const phone = clean(formData.get("phone"));

  if (fullName.length < 2) return { ok: false, message: "Enter the student's full name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "That email address does not look right." };
  if (one("SELECT 1 FROM users WHERE email = ?", email)) {
    return { ok: false, message: "Someone already has an account with that email." };
  }

  // The plan's student limit is a real limit, not a suggestion.
  const tenant = one<{ plan: string; name: string }>("SELECT plan, name FROM tenants WHERE id = ?", scope.tenantId);
  const plan = planOf(tenant?.plan ?? "starter");
  const active = activeStudentCount(scope.tenantId);
  if (active >= plan.maxStudents) {
    return {
      ok: false,
      message: `The ${plan.label} plan covers ${plan.maxStudents} active students and you have ${active}. Move a departed student out of the active stages, or upgrade the plan.`,
    };
  }

  const password = tempPassword();
  const studentId = uid();
  run(
    `INSERT INTO users (id, tenant_id, email, password_hash, full_name, phone, role, student_plan, email_verified, active, created_at)
     VALUES (?,?,?,?,?,?, 'student', NULL, 0, 1, ?)`,
    studentId, scope.tenantId, email, hashPassword(password), fullName, phone || null, now(),
  );
  // A student belongs to the office that enrolled them. Without this they land
  // with no branch and become invisible to the very counsellor who added them.
  run("UPDATE users SET branch_id = ? WHERE id = ?", scope.branchId, studentId);
  ensureProfile(studentId, scope.tenantId);
  saveProfile(studentId, scope.tenantId, {
    target_country: clean(formData.get("target_country")),
    intended_course: clean(formData.get("intended_course")),
  });
  ensureEntry(scope.tenantId, studentId, clean(formData.get("source")) || "Added by staff", scope.branchId);
  if (user.role === "counsellor") updateEntry(scope, studentId, { counsellor_id: user.id });
  addNote(scope, studentId, `Added to the pipeline by ${user.fullName}.`, "stage_change");

  logActivity(scope, {
    studentId, actorId: user.id, actorLabel: user.fullName,
    kind: "account.created",
    summary: `${fullName} enrolled by ${user.fullName}.`,
    detail: { email, phone: phone || null },
  });

  // The student is told how to get in by email rather than being read a
  // password over the counter. It reaches them even if they walked out before
  // anyone wrote it down, and it leaves a record that it was sent.
  const branch = one<{ name: string; slug: string }>(
    "SELECT name, slug FROM tenants WHERE id = ?", scope.tenantId,
  );
  const invite = sendInvite({
    tenantId: scope.tenantId,
    studentId, studentName: fullName, email, password,
    branchName: branch?.name ?? "your consultancy",
    branchSlug: branch?.slug ?? "app",
    sentById: user.id, sentByName: user.fullName,
    counsellorName: user.role === "counsellor" ? user.fullName : null,
  });

  revalidatePath("/app/pipeline");
  return {
    ok: true,
    message: `${fullName} enrolled. ${invite.note}`,
    // Still returned so staff can read it out to a student whose email is
    // wrong or who is standing at the desk. But it is no longer the only way
    // the student ever learns it.
    password,
  };
}

export async function setStage(formData: FormData) {
  const user = await requireRole(...STAFF);
  const scope = scopeOf(user);
  const studentId = clean(formData.get("student_id"));
  const stage = clean(formData.get("stage"));
  if (!canView(scope, studentId)) return;

  const before = getPipelineRow(scope, studentId);
  if (before?.stage === stage) return;
  updateEntry(scope, studentId, { stage });
  addNote(
    scope, studentId,
    `Moved from ${stageOf(before?.stage ?? "enquiry").label} to ${stageOf(stage).label} by ${user.fullName}.`,
    "stage_change",
  );
  logActivity(scope, {
    studentId, actorId: user.id, actorLabel: user.fullName,
    kind: "stage.changed",
    summary: `Stage moved to ${stageOf(stage).label}.`,
    detail: { from: before?.stage ?? "enquiry", to: stage },
  });
  revalidatePath("/app/pipeline");
  revalidatePath(`/app/pipeline/${studentId}`);
}

export async function assignCounsellor(formData: FormData) {
  const user = await requireRole(...STAFF);
  const scope = scopeOf(user);
  const studentId = clean(formData.get("student_id"));
  if (!canView(scope, studentId)) return;
  const counsellorId = clean(formData.get("counsellor_id")) || null;
  updateEntry(scope, studentId, { counsellor_id: counsellorId });
  const named = counsellorId
    ? one<{ full_name: string }>("SELECT full_name FROM users WHERE id = ?", counsellorId)?.full_name
    : null;
  logActivity(scope, {
    studentId, actorId: user.id, actorLabel: user.fullName,
    kind: "counsellor.assigned",
    summary: named ? `Counsellor set to ${named}.` : "Counsellor unassigned.",
  });
  if (counsellorId) {
    const student = one<{ full_name: string }>("SELECT full_name FROM users WHERE id = ?", studentId);
    notify({
      tenantId: scope.tenantId, userId: counsellorId, actorId: user.id,
      kind: "student.assigned",
      subject: `${student?.full_name ?? "A student"} is now yours`,
      line: `${user.fullName} made you the counsellor for ${student?.full_name ?? "a student"}.`,
      href: `/app/pipeline/${studentId}`,
      cta: "Open the file",
      dedupeKey: `student.assigned:${studentId}:${counsellorId}`,
    });
  }
  revalidatePath(`/app/pipeline/${studentId}`);
  revalidatePath("/app/pipeline");
}

/**
 * Give several students to one counsellor at once.
 *
 * An office with seventeen unclaimed files should not mean seventeen page
 * loads. Every id is still checked against this consultancy and this person's
 * own branch, the same as assigning one.
 */
export async function assignMany(formData: FormData) {
  const user = await requireRole(...STAFF);
  const scope = scopeOf(user);
  const counsellorId = clean(formData.get("counsellor_id")) || null;
  const ids = formData.getAll("student_id").map(String).filter(Boolean);
  if (!ids.length) return;

  if (counsellorId && !one(
    "SELECT 1 FROM users WHERE id = ? AND tenant_id = ? AND role IN ('counsellor','tenant_admin') AND active = 1",
    counsellorId, scope.tenantId,
  )) return;

  const named = counsellorId
    ? one<{ full_name: string }>("SELECT full_name FROM users WHERE id = ?", counsellorId)?.full_name
    : null;

  let handed = 0;
  for (const studentId of ids) {
    if (!canView(scope, studentId)) continue;
    updateEntry(scope, studentId, { counsellor_id: counsellorId });
    logActivity(scope, {
      studentId, actorId: user.id, actorLabel: user.fullName,
      kind: "counsellor.assigned",
      summary: named ? `Counsellor set to ${named}.` : "Counsellor unassigned.",
    });
    handed++;
  }

  // One email for the batch, not one per student. Handing somebody twenty
  // files should not mean twenty messages.
  if (counsellorId && handed > 0) {
    notify({
      tenantId: scope.tenantId, userId: counsellorId, actorId: user.id,
      kind: "student.assigned",
      subject: `${handed} student${handed === 1 ? " is" : "s are"} now yours`,
      line: `${user.fullName} gave you ${handed} student${handed === 1 ? "" : "s"} to look after.`,
      href: "/app/pipeline?mine=1",
      cta: "See them",
      dedupeKey: `students.handed:${counsellorId}:${Date.now()}`,
    });
  }
  revalidatePath("/app/pipeline");
}

export async function setNextAction(formData: FormData) {
  const user = await requireRole(...STAFF);
  const scope = scopeOf(user);
  const studentId = clean(formData.get("student_id"));
  if (!canView(scope, studentId)) return;
  const action = clean(formData.get("next_action"));
  const due = clean(formData.get("next_action_due"));
  updateEntry(scope, studentId, { next_action: action, next_action_due: due });
  logActivity(scope, {
    studentId, actorId: user.id, actorLabel: user.fullName,
    kind: "action.set",
    summary: action ? `Next action: ${action}${due ? ` (due ${due})` : ""}.` : "Next action cleared.",
  });
  revalidatePath(`/app/pipeline/${studentId}`);
  revalidatePath("/app/pipeline");
}

export async function postNote(formData: FormData) {
  const user = await requireRole(...STAFF);
  const scope = scopeOf(user);
  const studentId = clean(formData.get("student_id"));
  const body = clean(formData.get("body"));
  if (!canView(scope, studentId) || body.length < 2) return;
  addNote(scope, studentId, body);
  logActivity(scope, {
    studentId, actorId: user.id, actorLabel: user.fullName,
    kind: "note.added",
    summary: body.length > 90 ? `${body.slice(0, 90)}\u2026` : body,
  });
  revalidatePath(`/app/pipeline/${studentId}`);
}

/**
 * Sending a student their way in, again.
 *
 * Three screens told staff to "resend from their file" and no screen had a
 * button that did it. A student who never got the first email, or who typed
 * their own address wrong at the counter, was simply stuck, and so was the
 * office: nobody can read a password back out of a hash.
 *
 * So this mints a fresh one, posts it, and hands it to whoever pressed the
 * button as well, because half of these students are standing at the desk.
 */
export async function resendInvite(_prev: PipelineState, formData: FormData): Promise<PipelineState> {
  const user = await requireRole(...STAFF);
  const scope = scopeOf(user);
  const studentId = clean(formData.get("student_id"));
  if (!canView(scope, studentId)) return { ok: false, message: "That is not one of your students." };

  const student = one<{ full_name: string; email: string }>(
    "SELECT full_name, email FROM users WHERE id = ? AND tenant_id = ? AND role = 'student'",
    studentId, scope.tenantId,
  );
  if (!student) return { ok: false, message: "No such student." };

  // An address can be corrected here, because the commonest reason an invite
  // never arrived is that it went to a mistyped one.
  const typed = clean(formData.get("email")).toLowerCase();
  if (typed && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(typed)) {
    return { ok: false, message: "That email address does not look right." };
  }
  const email = typed || student.email;
  if (typed && typed !== student.email) {
    if (one("SELECT 1 FROM users WHERE email = ? AND id <> ?", typed, studentId)) {
      return { ok: false, message: "Somebody else already uses that email." };
    }
    run("UPDATE users SET email = ? WHERE id = ?", typed, studentId);
  }

  const password = tempPassword();
  run("UPDATE users SET password_hash = ? WHERE id = ?", hashPassword(password), studentId);
  // The old password stops working, so any session opened with it is ended.
  run("DELETE FROM sessions WHERE user_id = ?", studentId);

  const branch = one<{ name: string; slug: string }>(
    "SELECT name, slug FROM tenants WHERE id = ?", scope.tenantId,
  );
  const invite = sendInvite({
    tenantId: scope.tenantId,
    studentId, studentName: student.full_name, email, password,
    branchName: branch?.name ?? "your consultancy",
    branchSlug: branch?.slug ?? "app",
    sentById: user.id, sentByName: user.fullName,
  });

  revalidatePath(`/app/pipeline/${studentId}`);
  return {
    ok: true,
    message: `${invite.note} Their old password has stopped working.`,
    password,
  };
}
