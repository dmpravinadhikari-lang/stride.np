"use server";

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { codeMatches, linkByToken } from "@/modules/parents/data";
import { guard, keyFor, reset } from "@/lib/security/rate-limit";

/**
 * The code gate for a parent link.
 *
 * A verified visitor gets a short-lived signed cookie for that one link, so the
 * code is asked for once rather than on every page view. The cookie is scoped
 * to the link id, it unlocks nothing else.
 */
const secret = () => process.env.STRIDE_SESSION_SECRET || "dev-only-secret";
const stamp = (linkId: string) => createHmac("sha256", secret()).update(`parent:${linkId}`).digest("hex").slice(0, 32);
const cookieName = (linkId: string) => `pv_${linkId}`;

export async function isUnlocked(linkId: string, codeRequired: boolean): Promise<boolean> {
  if (!codeRequired) return true;
  const raw = (await cookies()).get(cookieName(linkId))?.value;
  if (!raw) return false;
  const want = stamp(linkId);
  return raw.length === want.length && timingSafeEqual(Buffer.from(raw), Buffer.from(want));
}

export type UnlockState = { ok: boolean; message?: string };

export async function unlock(_prev: UnlockState, formData: FormData): Promise<UnlockState> {
  const token = String(formData.get("token") ?? "");
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");

  // Six digits is a million combinations, which is minutes of guessing without
  // a limit. Capped per address and per link.
  const byIp = await guard("parentCode");
  if (!byIp.ok) return { ok: false, message: byIp.message };
  const byLink = await guard("parentCode", token);
  if (!byLink.ok) return { ok: false, message: byLink.message };

  const link = linkByToken(token);
  // Same message either way, a wrong code and a dead link look identical.
  if (!link || !codeMatches(code, link.code_hash)) {
    return { ok: false, message: "That code is not right. Ask the counsellor to read it out again." };
  }
  reset(await keyFor("parentCode", token));

  (await cookies()).set(cookieName(link.id), stamp(link.id), {
    httpOnly: true, sameSite: "lax", path: `/p/${token}`,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
  });
  revalidatePath(`/p/${token}`);
  return { ok: true };
}
