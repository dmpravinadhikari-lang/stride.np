"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/current";
import { setOverride } from "@/lib/auth/access";
import { isPosition, isDataScope, positionOf } from "@/lib/auth/positions";
import { isCapability } from "@/lib/auth/permissions";
import { one, run } from "@/lib/db";
import { logAccessChange } from "@/lib/security/audit";

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();

export type AccessState = { ok: boolean; message?: string };

/** Nobody edits somebody at another consultancy, whatever the form says. */
function colleague(tenantId: string, userId: string) {
  return one<{ id: string; full_name: string; role: string; position: string | null }>(
    "SELECT id, full_name, role, position FROM users WHERE id = ? AND tenant_id = ? AND role <> 'student'",
    userId, tenantId,
  );
}

/**
 * Giving somebody a job.
 *
 * The position carries the permissions, so this is the only control most
 * offices will ever touch. Changing it clears nothing: a named exception
 * granted to this person on purpose survives a change of title, which is what
 * an admin expects when they promote somebody.
 */
export async function setPosition(_prev: AccessState, formData: FormData): Promise<AccessState> {
  const me = await requirePermission("people:permissions");
  const userId = clean(formData.get("user_id"));
  const position = clean(formData.get("position"));
  const scope = clean(formData.get("data_scope"));

  const person = colleague(me.tenantId, userId);
  if (!person) return { ok: false, message: "That is not one of your colleagues." };
  if (!isPosition(position)) return { ok: false, message: "Choose a position from the list." };
  if (scope && !isDataScope(scope)) return { ok: false, message: "Choose how far they see." };

  /*
   * The last owner cannot demote themselves.
   *
   * A consultancy with nobody who can change permissions is a consultancy
   * locked out of its own account, and the only way back is us reaching into
   * the database. Refusing here costs one message; the alternative costs a
   * support call and a lot of trust.
   */
  if (person.id === me.id && position !== "owner") {
    return { ok: false, message: "You cannot take the managing director's position away from yourself. Ask another admin." };
  }

  run(
    "UPDATE users SET position = ?, data_scope = ? WHERE id = ? AND tenant_id = ?",
    position, scope || null, userId, me.tenantId,
  );
  logAccessChange({
    tenantId: me.tenantId, actorId: me.id, subjectId: userId,
    what: "position", detail: `${person.position ?? "unset"} to ${position}${scope ? `, sees ${scope}` : ""}`,
  });

  revalidatePath("/app/access");
  revalidatePath("/app/people");
  return { ok: true, message: `${person.full_name.split(" ")[0]} is now ${positionOf(position).label.toLowerCase()}.` };
}

/**
 * One exception, granted or refused by name.
 *
 * Three states rather than two: follow the position, always allow, never
 * allow. Without the first there is no way back to "whatever the job says",
 * and an office ends up with a thicket of exceptions nobody dares touch.
 */
export async function setException(formData: FormData) {
  const me = await requirePermission("people:permissions");
  const userId = clean(formData.get("user_id"));
  const perm = clean(formData.get("perm"));
  const state = clean(formData.get("state")); // inherit | allow | deny

  const person = colleague(me.tenantId, userId);
  if (!person || !isCapability(perm)) return;

  // Nobody can quietly remove their own ability to manage permissions, for
  // the same reason as above.
  if (person.id === me.id && perm === "people:permissions" && state === "deny") return;

  setOverride(userId, perm, state === "allow" ? true : state === "deny" ? false : null, me.id);
  logAccessChange({
    tenantId: me.tenantId, actorId: me.id, subjectId: userId,
    what: "exception", detail: `${perm}: ${state}`,
  });
  revalidatePath("/app/access");
}
