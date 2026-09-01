import { all, now, one, readJson, run, scalar, uid, writeJson } from "@/lib/db";
import type { Scope } from "@/lib/db/scope";
import type { SopReview, SopSection } from "@/modules/sop-studio/types";
import { EMPTY_REVIEW } from "@/modules/sop-studio/types";

export type SopDoc = {
  id: string; tenant_id: string; user_id: string; title: string; country: string;
  doc_type: string; university: string | null; course: string | null; status: string;
  acknowledged_risk: number; created_at: string; updated_at: string;
};
export type SopVersion = {
  id: string; document_id: string; version_no: number; source: string;
  body: string; word_count: number; note: string | null; created_at: string;
};

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
export const sectionsToBody = (sections: SopSection[]) =>
  sections.map((s) => `## ${s.heading}\n\n${s.body}`).join("\n\n");

export function bodyToSections(body: string): SopSection[] {
  const parts = body.split(/^##\s+/m).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return [{ heading: "Statement", body: body.trim() }];
  return parts.map((part) => {
    const [heading, ...rest] = part.split("\n");
    return { heading: heading.trim(), body: rest.join("\n").trim() };
  });
}

export function listDocs(scope: Scope): Array<SopDoc & { versions: number; latest_score: number | null }> {
  return all(
    `SELECT d.*,
            (SELECT COUNT(*) FROM sop_versions v WHERE v.document_id = d.id) AS versions,
            (SELECT r.overall FROM sop_reviews r WHERE r.document_id = d.id
              ORDER BY r.created_at DESC LIMIT 1) AS latest_score
       FROM sop_documents d
      WHERE d.tenant_id = ? AND d.user_id = ?
      ORDER BY d.updated_at DESC`,
    scope.tenantId, scope.userId,
  );
}

export function getDoc(scope: Scope, id: string): SopDoc | null {
  return one<SopDoc>(
    "SELECT * FROM sop_documents WHERE id = ? AND tenant_id = ? AND user_id = ?",
    id, scope.tenantId, scope.userId,
  );
}

export function createDoc(
  scope: Scope,
  input: { title: string; country: string; docType: string; university?: string; course?: string },
): string {
  const id = uid();
  const ts = now();
  run(
    `INSERT INTO sop_documents
       (id, tenant_id, user_id, title, country, doc_type, university, course, status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,'drafting',?,?)`,
    id, scope.tenantId, scope.userId, input.title, input.country, input.docType,
    input.university || null, input.course || null, ts, ts,
  );
  return id;
}

export function deleteDoc(scope: Scope, id: string) {
  run("DELETE FROM sop_reviews WHERE document_id = ? AND tenant_id = ?", id, scope.tenantId);
  run("DELETE FROM sop_versions WHERE document_id = ? AND tenant_id = ?", id, scope.tenantId);
  run("DELETE FROM sop_documents WHERE id = ? AND tenant_id = ? AND user_id = ?", id, scope.tenantId, scope.userId);
}

export function acknowledgeRisk(scope: Scope, id: string) {
  run(
    "UPDATE sop_documents SET acknowledged_risk = 1, updated_at = ? WHERE id = ? AND tenant_id = ? AND user_id = ?",
    now(), id, scope.tenantId, scope.userId,
  );
}

export function addVersion(
  scope: Scope,
  documentId: string,
  body: string,
  source: "ai_draft" | "student_edit" | "ai_revision",
  note?: string,
): string {
  const next = scalar(
    "SELECT COALESCE(MAX(version_no),0)+1 FROM sop_versions WHERE document_id = ?",
    documentId,
  );
  const id = uid();
  run(
    `INSERT INTO sop_versions
       (id, tenant_id, document_id, version_no, source, body, word_count, note, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    id, scope.tenantId, documentId, next, source, body, wordCount(body), note ?? null, now(),
  );
  run("UPDATE sop_documents SET updated_at = ? WHERE id = ?", now(), documentId);
  return id;
}

export const listVersions = (scope: Scope, documentId: string) =>
  all<SopVersion>(
    "SELECT * FROM sop_versions WHERE document_id = ? AND tenant_id = ? ORDER BY version_no DESC",
    documentId, scope.tenantId,
  );

export const latestVersion = (scope: Scope, documentId: string) =>
  one<SopVersion>(
    "SELECT * FROM sop_versions WHERE document_id = ? AND tenant_id = ? ORDER BY version_no DESC LIMIT 1",
    documentId, scope.tenantId,
  );

export function saveReview(scope: Scope, documentId: string, versionId: string, review: SopReview) {
  run(
    `INSERT INTO sop_reviews (id, tenant_id, document_id, version_id, overall, criteria, findings, integrity, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    uid(), scope.tenantId, documentId, versionId, Math.round(review.overall),
    writeJson(review.criteria), writeJson(review.findings), writeJson(review.integrity), now(),
  );
}

export function latestReview(scope: Scope, documentId: string): (SopReview & { created_at: string; version_id: string }) | null {
  const row = one<Record<string, unknown>>(
    "SELECT * FROM sop_reviews WHERE document_id = ? AND tenant_id = ? ORDER BY created_at DESC LIMIT 1",
    documentId, scope.tenantId,
  );
  if (!row) return null;
  return {
    overall: Number(row.overall ?? 0),
    criteria: readJson(row.criteria, EMPTY_REVIEW.criteria),
    findings: readJson(row.findings, EMPTY_REVIEW.findings),
    integrity: readJson(row.integrity, EMPTY_REVIEW.integrity),
    created_at: String(row.created_at),
    version_id: String(row.version_id),
  };
}
