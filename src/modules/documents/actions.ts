"use server";

import { revalidatePath } from "next/cache";
import { requireScope } from "@/lib/auth/current";
import { runAiJson } from "@/lib/ai/run";
import { creditsFor } from "@/lib/modules/registry";
import { OutOfCreditsError } from "@/lib/usage";
import { getProfile, profileBrief } from "@/lib/profile";
import { one } from "@/lib/db";
import { logActivity } from "@/lib/crm/activity";
import { isStaff } from "@/lib/auth/roles";
import {
  EMPTY_CHECK, getDocument, insertDocument, listDocuments, removeDocument,
  saveCheck, setDocStatus, setKeep, type CheckResult,
} from "@/modules/documents/data";
import { ALLOWED, MAX_BYTES, MAX_BYTES_PER_STUDENT, MAX_FILES_PER_STUDENT, deleteStored, storeFile } from "@/modules/documents/storage";
import { kindById, requiredFor } from "@/modules/documents/kinds";
import { checkSystem } from "@/modules/documents/prompts";
import { mayAccessStudent } from "@/modules/documents/access";
import { guard } from "@/lib/security/rate-limit";
import { scalar } from "@/lib/db";

export type DocState = { ok: boolean; message?: string };
const MODULE = "documents";

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const paths = (studentId: string) => ["/app/documents", `/app/documents/${studentId}`, `/app/pipeline/${studentId}`];
const refresh = (studentId: string) => paths(studentId).forEach((p) => revalidatePath(p));

export async function uploadDocument(_prev: DocState, formData: FormData): Promise<DocState> {
  const { user, scope } = await requireScope();
  const studentId = clean(formData.get("student_id")) || scope.userId;
  if (!mayAccessStudent(scope, studentId)) return { ok: false, message: "You cannot upload for that student." };

  const paced = await guard("upload", scope.userId);
  if (!paced.ok) return { ok: false, message: paced.message };

  const kind = clean(formData.get("kind"));
  if (!kindById(kind)) return { ok: false, message: "Choose what this document is." };

  // A per-student ceiling, so nobody can fill the server's disk one 8MB scan at
  // a time. Generous against the ~32 documents anyone actually needs.
  const held = scalar("SELECT COUNT(*) FROM documents WHERE student_id = ?", studentId);
  const heldBytes = scalar("SELECT COALESCE(SUM(bytes),0) FROM documents WHERE student_id = ?", studentId);
  if (held >= MAX_FILES_PER_STUDENT) {
    return { ok: false, message: `That is ${held} documents already, which is the limit. Delete something you no longer need.` };
  }
  if (heldBytes >= MAX_BYTES_PER_STUDENT) {
    return { ok: false, message: `Your documents already take up ${(heldBytes / 1048576).toFixed(0)} MB, which is the limit. Delete something, or replace a large scan with a smaller one.` };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose a file to upload." };
  if (file.size > MAX_BYTES) {
    return { ok: false, message: `That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is 8 MB — photograph it at a lower resolution, or save the PDF smaller.` };
  }
  if (!ALLOWED.has(file.type)) {
    return { ok: false, message: "Upload a PDF or a photo (JPG, PNG, WEBP, HEIC). Word files and screenshots of screens are not accepted." };
  }

  const stored = await storeFile(scope.tenantId, studentId, file);
  insertDocument(scope, {
    studentId, kind, label: clean(formData.get("label")) || null,
    filename: file.name.slice(0, 120), mime: file.type, bytes: stored.bytes, path: stored.path,
  });
  refresh(studentId);

  const k = kindById(kind)!;
  logActivity(scope, {
    studentId, actorId: user.id, actorLabel: user.fullName,
    kind: "doc.uploaded",
    summary: `${k.label} uploaded (${file.name.slice(0, 60)}).`,
    detail: { kind, bytes: stored.bytes, sensitive: k.sensitive },
  });
  return {
    ok: true,
    message: k.sensitive
      ? `${k.label} uploaded. It is a sensitive document, so it is set to delete itself in 90 days unless you choose to keep it.`
      : `${k.label} uploaded.`,
  };
}

export async function deleteDocument(formData: FormData) {
  const { user, scope } = await requireScope();
  const doc = getDocument(scope, clean(formData.get("id")));
  if (!doc || !mayAccessStudent(scope, doc.student_id)) return;
  await deleteStored(doc.storage_path);
  removeDocument(scope, doc.id);
  logActivity(scope, {
    studentId: doc.student_id, actorId: user.id, actorLabel: user.fullName,
    kind: "doc.deleted",
    summary: `${doc.filename} deleted.`,
  });
  refresh(doc.student_id);
}

export async function verifyDocument(formData: FormData) {
  const { user, scope } = await requireScope();
  if (!isStaff(user.role)) return;             // a student cannot verify their own paperwork
  const doc = getDocument(scope, clean(formData.get("id")));
  if (!doc || !mayAccessStudent(scope, doc.student_id)) return;
  const status = clean(formData.get("status")) || "verified";
  const note = clean(formData.get("note")) || null;
  setDocStatus(scope, doc.id, status, note);
  logActivity(scope, {
    studentId: doc.student_id, actorId: user.id, actorLabel: user.fullName,
    kind: status === "verified" ? "doc.verified" : "doc.rejected",
    summary: status === "verified"
      ? `${doc.filename} verified by ${user.fullName}.`
      : `${doc.filename} sent back${note ? `: ${note}` : "."}`,
  });
  refresh(doc.student_id);
}

export async function keepDocument(formData: FormData) {
  const { scope } = await requireScope();
  const doc = getDocument(scope, clean(formData.get("id")));
  if (!doc || !mayAccessStudent(scope, doc.student_id)) return;
  setKeep(scope, doc.id, clean(formData.get("keep")) === "1");
  refresh(doc.student_id);
}

export async function runCheck(_prev: DocState, formData: FormData): Promise<DocState> {
  const { scope } = await requireScope();
  const studentId = clean(formData.get("student_id")) || scope.userId;
  if (!mayAccessStudent(scope, studentId)) return { ok: false, message: "You cannot check that student's file." };

  const profile = getProfile(studentId);
  const stage = one<{ stage: string }>(
    "SELECT stage FROM pipeline_entries WHERE student_id = ? AND tenant_id = ?", studentId, scope.tenantId,
  )?.stage ?? "applying";
  const student = one<{ full_name: string }>("SELECT full_name FROM users WHERE id = ?", studentId);

  const have = listDocuments(scope, studentId);
  const need = requiredFor(profile?.target_country ?? null, stage);

  try {
    const result = await runAiJson<CheckResult>(
      scope,
      {
        module: MODULE, action: "documents.check", tier: "smart", maxTokens: 2200,
        system: checkSystem(profile?.target_country ?? null),
        prompt:
          `STUDENT PROFILE\n${profileBrief(profile, student?.full_name ?? "the student")}\n\n` +
          `STAGE: ${stage}\n\n` +
          `DOCUMENTS UPLOADED\n${have.length
            ? have.map((d) => `- ${kindById(d.kind)?.label ?? d.kind} (${d.status}, uploaded ${d.created_at.slice(0, 10)})`).join("\n")
            : "(nothing uploaded yet)"}\n\n` +
          `DOCUMENTS THIS DESTINATION AND STAGE REQUIRE\n${need.map((k) => `- ${k.id}: ${k.label} — ${k.hint}`).join("\n")}`,
      },
      creditsFor(MODULE, "completeness_check"),
      EMPTY_CHECK,
    );
    saveCheck(scope, studentId, result);
    refresh(studentId);
    return { ok: true, message: `File checked — ${Math.round(result.readiness)}% ready.` };
  } catch (error) {
    if (error instanceof OutOfCreditsError) return { ok: false, message: error.message };
    return { ok: false, message: `The check failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}
