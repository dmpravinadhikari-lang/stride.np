import { all, now, one, run, uid } from "@/lib/db";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Scope } from "@/lib/db/scope";

export type ParentLink = {
  id: string; token: string; tenant_id: string; student_id: string; created_by: string;
  parent_name: string; relation: string; code_hash: string | null; revoked: number;
  view_count: number; last_viewed_at: string | null; created_at: string;
};

export const newToken = () => randomBytes(24).toString("base64url");
export const newCode = () => String(randomBytes(3).readUIntBE(0, 3) % 1000000).padStart(6, "0");

const hashCode = (code: string) => {
  const salt = randomBytes(8).toString("hex");
  return `${salt}$${scryptSync(code, salt, 32).toString("hex")}`;
};
export function codeMatches(code: string, stored: string | null): boolean {
  if (!stored) return true;                       // no code set on this link
  const [salt, want] = stored.split("$");
  if (!salt || !want) return false;
  const got = scryptSync(code, salt, 32);
  const expected = Buffer.from(want, "hex");
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export function createLink(
  scope: Scope,
  input: { studentId: string; parentName: string; relation: string; code: string | null },
): { token: string } {
  const token = newToken();
  run(
    `INSERT INTO parent_links (id, token, tenant_id, student_id, created_by, parent_name, relation, code_hash, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    uid(), token, scope.tenantId, input.studentId, scope.userId,
    input.parentName, input.relation, input.code ? hashCode(input.code) : null, now(),
  );
  return { token };
}

export const linksFor = (scope: Scope, studentId: string) =>
  all<ParentLink>(
    "SELECT * FROM parent_links WHERE student_id = ? AND tenant_id = ? ORDER BY created_at DESC",
    studentId, scope.tenantId,
  );

export const revokeLink = (scope: Scope, id: string) =>
  run("UPDATE parent_links SET revoked = 1 WHERE id = ? AND tenant_id = ?", id, scope.tenantId);

/** Looked up from the public page — no session, so no scope. */
export const linkByToken = (token: string) =>
  one<ParentLink>("SELECT * FROM parent_links WHERE token = ? AND revoked = 0", token);

export function recordView(id: string) {
  run("UPDATE parent_links SET view_count = view_count + 1, last_viewed_at = ? WHERE id = ?", now(), id);
}
