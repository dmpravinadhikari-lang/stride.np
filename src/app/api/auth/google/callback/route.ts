import { NextResponse } from "next/server";
import { now, one, run } from "@/lib/db";
import { startSession } from "@/lib/auth/session";
import { exchangeCode, googleConfigured, readState, STATE_COOKIE } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, url.origin));

  if (!googleConfigured()) return fail("google-not-configured");
  if (url.searchParams.get("error")) return fail("google-cancelled");

  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state") ?? undefined;
  const cookieState = request.headers.get("cookie")?.match(new RegExp(`${STATE_COOKIE}=([^;]+)`))?.[1];
  if (!code) return fail("google-no-code");
  if (!returnedState || returnedState !== cookieState) return fail("google-bad-state");

  const { ok, next } = readState(returnedState);
  if (!ok) return fail("google-bad-state");

  let profile;
  try {
    profile = await exchangeCode(code, new URL("/api/auth/google/callback", url.origin).toString());
  } catch {
    return fail("google-exchange-failed");
  }
  if (!profile.emailVerified) return fail("google-email-unverified");

  // Already linked?
  let user = one<{ id: string; active: number }>(
    "SELECT id, active FROM users WHERE google_sub = ?", profile.sub,
  );

  // Same email, signed up with a password before — link the two rather than
  // creating a second account they will not understand.
  if (!user) {
    const byEmail = one<{ id: string; active: number }>(
      "SELECT id, active FROM users WHERE email = ?", profile.email,
    );
    if (byEmail) {
      run(
        "UPDATE users SET google_sub = ?, avatar_url = COALESCE(avatar_url, ?), email_verified = 1 WHERE id = ?",
        profile.sub, profile.picture, byEmail.id,
      );
      user = byEmail;
    }
  }

  // No match. Google is a faster way into an account that already exists, not
  // a way to create one — a student's account is opened by their consultancy,
  // and an account with no consultancy behind it has no counsellor, no file
  // and nobody accountable for it. Send them back with an explanation rather
  // than silently making a stray account.
  if (!user) return fail("no-account");

  if (!user.active) return fail("account-disabled");

  run("UPDATE users SET last_seen_at = ? WHERE id = ?", now(), user.id);
  await startSession(user.id);

  const response = NextResponse.redirect(new URL(next, url.origin));
  response.cookies.delete(STATE_COOKIE);
  return response;
}
