import { createHash, randomBytes } from "node:crypto";
import { now, one, run, uid } from "@/lib/db";
import type { Scope } from "@/lib/db/scope";
import type { Role } from "@/lib/auth/roles";

/**
 * Bearer tokens for the mobile app.
 *
 * The web stays on cookies. They are the right tool in a browser and they are
 * already hardened. A native app has no cookie jar worth trusting, so it gets a
 * token instead. Both paths end at the same Scope, so every query, every
 * permission check and every tenant wall behaves identically whichever door the
 * request came through.
 */
const DAYS = 60;
const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");

export function issueToken(userId: string, device: string | null): { token: string; expiresAt: string } {
  const raw = `stk_${randomBytes(32).toString("base64url")}`;
  const expiresAt = new Date(Date.now() + DAYS * 864e5).toISOString();
  run(
    `INSERT INTO api_tokens (id, user_id, token_hash, device, expires_at, created_at)
     VALUES (?,?,?,?,?,?)`,
    uid(), userId, hash(raw), device, expiresAt, now(),
  );
  return { token: raw, expiresAt };
}

export type ApiActor = { scope: Scope; userId: string; email: string; fullName: string; role: Role };

/** Resolves an Authorization header into the same Scope the web uses. */
export function actorFromRequest(request: Request): ApiActor | null {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const raw = header.slice(7).trim();
  if (!raw) return null;

  const row = one<{
    id: string; user_id: string; expires_at: string; tenant_id: string;
    email: string; full_name: string; role: string; active: number;
    branch_id: string | null; is_head_office: number | null;
  }>(
    `SELECT t.id, t.user_id, t.expires_at, u.tenant_id, u.email, u.full_name, u.role, u.active,
            u.branch_id, b.is_head_office
       FROM api_tokens t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN branches b ON b.id = u.branch_id
      WHERE t.token_hash = ? AND t.revoked = 0`,
    hash(raw),
  );
  if (!row || !row.active) return null;
  if (new Date(row.expires_at) < new Date()) return null;

  run("UPDATE api_tokens SET last_used_at = ? WHERE id = ?", now(), row.id);
  return {
    scope: {
      tenantId: row.tenant_id, userId: row.user_id, role: row.role as Role,
      // A bearer token has to resolve to the same branch rule the browser
      // gives this person. Defaulting it either way would make the API a way
      // around the branch wall.
      branchId: row.branch_id ?? null,
      allBranches:
        row.role === "super_admin" || row.role === "tenant_admin" ||
        String(row.is_head_office) === "1",
    },
    userId: row.user_id, email: row.email, fullName: row.full_name, role: row.role as Role,
  };
}

export function revokeToken(request: Request): boolean {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return false;
  run("UPDATE api_tokens SET revoked = 1 WHERE token_hash = ?", hash(header.slice(7).trim()));
  return true;
}
