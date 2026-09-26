"use server";

import { completeReset, requestReset } from "@/lib/auth/reset";
import { clientIp, guard } from "@/lib/security/rate-limit";

export type ResetFormState = { ok: boolean; message?: string; done?: boolean };

/**
 * Asking for a link.
 *
 * The reply is the same whichever address is typed. It has to be: a form that
 * says "no such account" is a form that tells a stranger which of their
 * guesses are real.
 */
export async function askForReset(_prev: ResetFormState, formData: FormData): Promise<ResetFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, message: "That email address does not look right." };
  }

  // Per address and per connection, so this cannot be used to bomb somebody's
  // inbox or to work through a list of addresses.
  const limited = await guard("passwordReset", email);
  if (!limited.ok) return { ok: false, message: limited.message };

  await requestReset(email, await clientIp());
  return { ok: true, done: true };
}

/** Setting the new password from the link. */
export async function setNewPassword(_prev: ResetFormState, formData: FormData): Promise<ResetFormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const again = String(formData.get("again") ?? "");

  const limited = await guard("passwordReset", token.slice(0, 12));
  if (!limited.ok) return { ok: false, message: limited.message };

  if (password !== again) return { ok: false, message: "The two passwords are not the same." };

  const result = completeReset(token, password);
  return result.ok
    ? { ok: true, done: true, message: result.message }
    : { ok: false, message: result.message };
}
