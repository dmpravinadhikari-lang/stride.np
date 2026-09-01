import { all, now, one, readJson, run, scalar, uid, writeJson } from "@/lib/db";
import type { Scope } from "@/lib/db/scope";
import { kindById } from "@/modules/documents/kinds";

export type DocRow = {
  id: string; tenant_id: string; student_id: string; kind: string; label: string | null;
  filename: string; mime: string; bytes: number; storage_path: string;
  uploaded_by: string; status: string; note: string | null;
  expires_at: string | null; keep: number; created_at: string;
};

export type CheckResult = {
  readiness: number;
  summary: string;
  missing: Array<{ kind: string; label: string; why: string; severity: "critical" | "warning" | "note" }>;
  issues: Array<{ kind: string; issue: string; severity: "critical" | "warning" | "note" }>;
};
export const EMPTY_CHECK: CheckResult = { readiness: 0, summary: "", missing: [], issues: [] };

/** Sensitive files are dated to disappear; the rest are kept. */
export const RETENTION_DAYS = 90;
export function expiryFor(kind: string): string | null {
  return kindById(kind)?.sensitive
    ? new Date(Date.now() + RETENTION_DAYS * 864e5).toISOString()
    : null;
}

export const listDocuments = (scope: Scope, studentId: string) =>
  all<DocRow>(
    "SELECT * FROM documents WHERE student_id = ? AND tenant_id = ? ORDER BY created_at DESC",
    studentId, scope.tenantId,
  );

export const getDocument = (scope: Scope, id: string) =>
  one<DocRow>("SELECT * FROM documents WHERE id = ? AND tenant_id = ?", id, scope.tenantId);

export function insertDocument(
  scope: Scope,
  d: { studentId: string; kind: string; label: string | null; filename: string; mime: string; bytes: number; path: string },
): string {
  const id = uid();
  run(
    `INSERT INTO documents (id, tenant_id, student_id, kind, label, filename, mime, bytes,
                            storage_path, uploaded_by, status, expires_at, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?, 'uploaded', ?, ?)`,
    id, scope.tenantId, d.studentId, d.kind, d.label, d.filename, d.mime, d.bytes,
    d.path, scope.userId, expiryFor(d.kind), now(),
  );
  return id;
}

export const removeDocument = (scope: Scope, id: string) => {
  run("DELETE FROM document_access WHERE document_id = ? AND tenant_id = ?", id, scope.tenantId);
  run("DELETE FROM documents WHERE id = ? AND tenant_id = ?", id, scope.tenantId);
};

export const setDocStatus = (scope: Scope, id: string, status: string, note: string | null) =>
  run(
    "UPDATE documents SET status = ?, note = ? WHERE id = ? AND tenant_id = ?",
    status, note, id, scope.tenantId,
  );

export const setKeep = (scope: Scope, id: string, keep: boolean) =>
  run(
    "UPDATE documents SET keep = ?, expires_at = CASE WHEN ? = 1 THEN NULL ELSE expires_at END WHERE id = ? AND tenant_id = ?",
    keep ? 1 : 0, keep ? 1 : 0, id, scope.tenantId,
  );

export function logAccess(scope: Scope, documentId: string) {
  run(
    "INSERT INTO document_access (id, tenant_id, document_id, viewer_id, created_at) VALUES (?,?,?,?,?)",
    uid(), scope.tenantId, documentId, scope.userId, now(),
  );
}

export const accessLog = (scope: Scope, documentId: string) =>
  all<{ viewer: string; created_at: string }>(
    `SELECT u.full_name AS viewer, a.created_at
       FROM document_access a JOIN users u ON u.id = a.viewer_id
      WHERE a.document_id = ? AND a.tenant_id = ?
      ORDER BY a.created_at DESC LIMIT 20`,
    documentId, scope.tenantId,
  );

export function saveCheck(scope: Scope, studentId: string, result: CheckResult) {
  run(
    "INSERT INTO document_checks (id, tenant_id, student_id, readiness, result, created_at) VALUES (?,?,?,?,?,?)",
    uid(), scope.tenantId, studentId, Math.round(result.readiness), writeJson(result), now(),
  );
}

export function latestCheck(scope: Scope, studentId: string): (CheckResult & { created_at: string }) | null {
  const row = one<{ result: string; created_at: string }>(
    "SELECT result, created_at FROM document_checks WHERE student_id = ? AND tenant_id = ? ORDER BY created_at DESC LIMIT 1",
    studentId, scope.tenantId,
  );
  if (!row) return null;
  return { ...readJson<CheckResult>(row.result, EMPTY_CHECK), created_at: row.created_at };
}

export const documentCount = (scope: Scope, studentId: string) =>
  scalar("SELECT COUNT(*) FROM documents WHERE student_id = ? AND tenant_id = ?", studentId, scope.tenantId);

/** Files past their retention date that the student did not ask to keep. */
export const expiringSoon = (scope: Scope, studentId: string, withinDays = 14) =>
  all<DocRow>(
    `SELECT * FROM documents
      WHERE student_id = ? AND tenant_id = ? AND keep = 0
        AND expires_at IS NOT NULL AND expires_at <= ?
      ORDER BY expires_at`,
    studentId, scope.tenantId, new Date(Date.now() + withinDays * 864e5).toISOString(),
  );
