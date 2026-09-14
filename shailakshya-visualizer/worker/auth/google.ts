/**
 * Google sign-in.
 *
 * The customer signs in after describing what they want and before the design
 * is shown. That is the company's decision and it is the standard pattern for
 * this kind of tool, but it is worth recording the trade it makes: SPEC §8 said
 * "first generation is free, no signup — the user must see value before being
 * asked for anything". Gating earlier captures more leads per visitor and loses
 * some visitors entirely. Which way that nets out is a question for real
 * traffic, and AUTH_REQUIRED can be turned off without a code change if the
 * answer turns out to be the other one.
 *
 * The gate also protects the metered calls: parsing and generating both cost
 * money, and an anonymous endpoint is one someone can script.
 *
 * Verification happens here, never in the browser. A client that says "I am
 * signed in" is a client saying anything it likes.
 */
import type { Env } from '../lib/env.ts';

/**
 * Google's own endpoint validates the signature, issuer and expiry for us.
 * Verifying the RS256 signature locally against Google's JWKS would save a
 * round trip and is what a high-volume service should do; at this volume the
 * hop costs a few tens of milliseconds and removes a page of crypto code that
 * would have to be right.
 */
const TOKENINFO = 'https://oauth2.googleapis.com/tokeninfo?id_token=';

const SESSION_COOKIE = 'sgv_session';
const SESSION_DAYS = 30;

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

interface TokenInfo {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  exp?: string;
  iss?: string;
  error_description?: string;
}

export function authConfigured(env: Env): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.SESSION_SECRET);
}

/** Whether a visitor must be signed in before seeing a design. */
export function authRequired(env: Env): boolean {
  return authConfigured(env) && env.AUTH_REQUIRED !== 'false';
}

export async function verifyGoogleToken(
  env: Env,
  credential: string,
): Promise<GoogleIdentity> {
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('google: GOOGLE_CLIENT_ID is not set');

  const response = await fetch(TOKENINFO + encodeURIComponent(credential));
  const info = (await response.json()) as TokenInfo;

  if (!response.ok) {
    throw new Error(`google: token rejected — ${info.error_description ?? response.status}`);
  }

  // Checked here rather than trusted: a valid Google token issued for a
  // *different* application would otherwise be accepted as a login to ours.
  if (info.aud !== clientId) throw new Error('google: token was issued for another application');

  if (info.iss !== 'accounts.google.com' && info.iss !== 'https://accounts.google.com') {
    throw new Error('google: unexpected issuer');
  }

  if (Number(info.exp) * 1000 <= Date.now()) throw new Error('google: token has expired');
  if (!info.sub) throw new Error('google: token carried no subject');

  const emailVerified = info.email_verified === true || info.email_verified === 'true';

  return {
    sub: info.sub,
    email: info.email ?? '',
    emailVerified,
    name: info.name ?? '',
    ...(info.picture ? { picture: info.picture } : {}),
  };
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

/**
 * A signed cookie rather than a stored session: there is no server state to
 * expire or replicate, and the signature is what makes it unforgeable. The
 * payload holds only the Google subject and the expiry — no email, so a cookie
 * lifted off a shared machine leaks nothing readable.
 */
export async function issueSession(env: Env, sub: string): Promise<string> {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${sub}.${expires}`;
  const signature = await sign(env, payload);
  const value = `${payload}.${signature}`;

  return [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
  ].join('; ');
}

export async function readSession(env: Env, request: Request): Promise<string | null> {
  const header = request.headers.get('Cookie') ?? '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (!match?.[1]) return null;

  const [sub, expires, signature] = decodeURIComponent(match[1]).split('.');
  if (!sub || !expires || !signature) return null;

  if (Number(expires) <= Date.now()) return null;
  if (!(await verify(env, `${sub}.${expires}`, signature))) return null;

  return sub;
}

export function clearSession(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

async function key(env: Env): Promise<CryptoKey> {
  const secret = env.SESSION_SECRET;
  if (!secret) throw new Error('session: SESSION_SECRET is not set');

  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function sign(env: Env, payload: string): Promise<string> {
  const mac = await crypto.subtle.sign('HMAC', await key(env), new TextEncoder().encode(payload));
  return base64Url(new Uint8Array(mac));
}

/** Uses the platform's verify, which compares in constant time. */
async function verify(env: Env, payload: string, signature: string): Promise<boolean> {
  try {
    return await crypto.subtle.verify(
      'HMAC',
      await key(env),
      fromBase64Url(signature),
      new TextEncoder().encode(payload),
    );
  } catch {
    return false;
  }
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
