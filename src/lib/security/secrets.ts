import "server-only";
import { scryptSync } from "node:crypto";

/**
 * The secrets, in one place, with one rule: never silently fall back in
 * production.
 *
 * Five files used to read `process.env.STRIDE_SESSION_SECRET || "dev-only-secret"`.
 * On a laptop that is a convenience. On a server where somebody forgot one
 * line of the environment file, it is a published key: the fallback is in a
 * public repository, and anybody holding it can forge a session cookie for any
 * account in any consultancy. The same is true of the key that seals
 * documents, where the consequence is a folder of passports that decrypt with
 * a value printed in the source.
 *
 * So development keeps its convenience, and production refuses to start.
 * Refusing is the friendly outcome: a server that will not boot is noticed in
 * the first minute, and one that boots with a known key is noticed by somebody
 * else, later.
 */

const DEV_FALLBACK = "dev-only-secret";

const isProduction = () => process.env.NODE_ENV === "production";

function required(name: string, hint: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (isProduction()) {
    throw new Error(
      `${name} is not set. ${hint} Generate one with: openssl rand -base64 32`,
    );
  }
  return "";
}

/** Signs session cookies, parent unlock codes and the Google state parameter. */
export function sessionSecret(): string {
  return required(
    "STRIDE_SESSION_SECRET",
    "Without it every session cookie would be signed with a key published in the source.",
  ) || DEV_FALLBACK;
}

/**
 * Seals uploaded documents.
 *
 * A dedicated key rather than the session secret, so that rotating one does
 * not make the other unreadable: changing the session secret signs everybody
 * out, which is survivable; changing the document key without re-sealing loses
 * every passport on the disk, which is not.
 */
export function documentKey(): Buffer {
  const raw = process.env.STRIDE_FILE_KEY?.trim();
  if (raw) {
    const key = Buffer.from(raw, "base64");
    if (key.length !== 32) {
      // A short or mistyped key fails loudly rather than silently weakening
      // every document uploaded from this moment on.
      throw new Error("STRIDE_FILE_KEY must be 32 bytes, base64 encoded. Generate one with: openssl rand -base64 32");
    }
    return key;
  }
  if (isProduction()) {
    throw new Error(
      "STRIDE_FILE_KEY is not set. Documents would be sealed with a key derived from a value published in the source.",
    );
  }
  return scryptSync(sessionSecret(), "stride-documents", 32);
}

/** The bearer token the scheduled jobs present. */
export function cronSecret(): string | null {
  return process.env.STRIDE_CRON_SECRET?.trim() || null;
}
