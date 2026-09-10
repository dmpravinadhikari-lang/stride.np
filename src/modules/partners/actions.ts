"use server";

import { revalidatePath } from "next/cache";
import { requireScope } from "@/lib/auth/current";
import { can } from "@/lib/auth/permissions";
import { logActivity } from "@/lib/crm/activity";
import { canView } from "@/modules/pipeline/data";
import {
  createApplication, setApplicationStatus, statusOf,
} from "@/modules/partners/applications";
import { createPartner, updatePartner } from "@/modules/partners/data";

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const num = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export async function addApplication(formData: FormData) {
  const { user, scope } = await requireScope();
  if (!can(user.role, "applications:manage")) return;

  const studentId = clean(formData.get("student_id"));
  const institution = clean(formData.get("institution"));
  if (!canView(scope, studentId) || institution.length < 2) return;

  createApplication(scope, {
    studentId,
    institution,
    partnerId: clean(formData.get("partner_id")) || null,
    course: clean(formData.get("course")),
    destination: clean(formData.get("destination")),
    intake: clean(formData.get("intake")),
    deadline: clean(formData.get("deadline")),
    tuition_npr: num(formData.get("tuition_npr")),
  });

  logActivity(scope, {
    studentId, actorId: user.id, actorLabel: user.fullName,
    kind: "note.added",
    summary: `Application added: ${institution}${clean(formData.get("course")) ? `, ${clean(formData.get("course"))}` : ""}.`,
  });

  revalidatePath(`/app/pipeline/${studentId}`);
}

export async function moveApplication(formData: FormData) {
  const { user, scope } = await requireScope();
  if (!can(user.role, "applications:manage")) return;

  const studentId = clean(formData.get("student_id"));
  const id = clean(formData.get("application_id"));
  const status = clean(formData.get("status"));
  if (!canView(scope, studentId)) return;

  setApplicationStatus(scope, id, status);
  logActivity(scope, {
    studentId, actorId: user.id, actorLabel: user.fullName,
    kind: "stage.changed",
    summary: `${clean(formData.get("institution"))}: ${statusOf(status).label.toLowerCase()}.`,
    detail: { applicationId: id, status },
  });
  revalidatePath(`/app/pipeline/${studentId}`);
}

export async function savePartner(formData: FormData) {
  const { user, scope } = await requireScope();
  if (!can(user.role, "partners:manage")) return;

  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));
  if (name.length < 2) return;

  // Commission is only ever read from the form when the caller may see it.
  // Without this check a counsellor could post the field by hand and set a
  // rate they are not allowed to know.
  const money = can(user.role, "partners:money")
    ? {
        commission_rate: num(formData.get("commission_rate")),
        commission_note: clean(formData.get("commission_note")) || null,
      }
    : {};

  const patch = {
    name,
    country: clean(formData.get("country")) || null,
    city: clean(formData.get("city")) || null,
    website: clean(formData.get("website")) || null,
    contact_name: clean(formData.get("contact_name")) || null,
    contact_email: clean(formData.get("contact_email")) || null,
    contact_phone: clean(formData.get("contact_phone")) || null,
    priority: Number(clean(formData.get("priority"))) || null,
    priority_note: clean(formData.get("priority_note")) || null,
    status: clean(formData.get("status")) || "active",
    ...money,
  };

  if (id) updatePartner(scope, id, patch);
  else createPartner(scope, { ...patch, name });

  revalidatePath("/app/partners");
}
