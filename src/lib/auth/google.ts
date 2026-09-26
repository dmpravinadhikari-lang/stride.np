import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { sessionSecret } from "@/lib/security/secrets";

/**
 * Google sign-in, using the standard authorisation-code flow.
 *
 * The token is exchanged server side and the profile is read from Google's
 * userinfo endpoint, so no ID token has to be verified by hand here. The
 * client secret never reaches the browser.
 */
export const googleConfigured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const STATE_COOKIE = "g_state";

const secret = sessionSecret;
const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("hex").slice(0, 32);

/** State carries a nonce and where to go afterwards, signed so it cannot be forged. */
export function makeState(next: string): string {
  const nonce = randomBytes(12).toString("hex");
  const payload = `${nonce}|${next}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export function readState(raw: string | undefined): { ok: boolean; next: string } {
  if (!raw) return { ok: false, next: "/app" };
  const [encoded, mac] = raw.split(".");
  if (!encoded || !mac) return { ok: false, next: "/app" };
  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString();
  } catch {
    return { ok: false, next: "/app" };
  }
  const expected = sign(payload);
  if (mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) {
    return { ok: false, next: "/app" };
  }
  const next = payload.split("|")[1] ?? "/app";
  // Only ever redirect somewhere inside this site.
  return { ok: true, next: next.startsWith("/") && !next.startsWith("//") ? next : "/app" };
}

export function authorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export type GoogleProfile = { sub: string; email: string; emailVerified: boolean; name: string; picture: string | null };

export async function exchangeCode(code: string, redirectUri: string): Promise<GoogleProfile> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) throw new Error(`Google rejected the code exchange (${tokenRes.status}).`);
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) throw new Error("Google returned no access token.");

  const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) throw new Error(`Could not read the Google profile (${infoRes.status}).`);
  const info = (await infoRes.json()) as {
    sub: string; email?: string; email_verified?: boolean; name?: string; picture?: string;
  };
  if (!info.email) throw new Error("That Google account has no email address on it.");

  return {
    sub: info.sub,
    email: info.email.toLowerCase(),
    emailVerified: Boolean(info.email_verified),
    name: info.name || info.email.split("@")[0],
    picture: info.picture ?? null,
  };
}
