import { one, now, run } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { issueToken } from "@/lib/api/auth";
import { fail, ok } from "@/lib/api/respond";
import { guard } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // The same ceiling the web login has. An app is not a way around it.
  const byIp = await guard("loginIp");
  if (!byIp.ok) return fail(429, "rate_limited", byIp.message);

  let body: { email?: string; password?: string; device?: string };
  try {
    body = await request.json();
  } catch {
    return fail(400, "bad_request", "Send JSON with an email and a password.");
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) return fail(400, "bad_request", "Enter your email and password.");

  const byAccount = await guard("login", email);
  if (!byAccount.ok) return fail(429, "rate_limited", byAccount.message);

  const user = one<{ id: string; password_hash: string; active: number; full_name: string; role: string }>(
    "SELECT id, password_hash, active, full_name, role FROM users WHERE email = ?", email,
  );
  // Same answer for a wrong password and an unknown address.
  if (!user || !verifyPassword(password, user.password_hash)) {
    return fail(401, "invalid_credentials", "That email and password do not match an account.");
  }
  if (!user.active) return fail(403, "account_disabled", "This account has been switched off.");

  run("UPDATE users SET last_seen_at = ? WHERE id = ?", now(), user.id);
  const { token, expiresAt } = issueToken(user.id, (body.device ?? "").slice(0, 80) || null);

  return ok({
    token, expiresAt,
    user: { id: user.id, name: user.full_name, role: user.role },
  });
}
