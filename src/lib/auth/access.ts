import "server-only";
import { all, now, one, run } from "@/lib/db";
import {
  ROLE_CAPABILITIES, isCapability, type Capability,
} from "@/lib/auth/permissions";
import {
  defaultPositionFor, positionOf, type DataScope,
} from "@/lib/auth/positions";

/**
 * "May this person do that", answered in four layers.
 *
 *   1. Role      the system's own word. A student is never handed a staff
 *                capability by any position, and the platform owner is the
 *                only account that reaches across consultancies.
 *   2. Position  the job, which carries a set of capabilities.
 *   3. Overrides what this one person was granted or refused by name, which
 *                beats their position. An office can hand one trusted
 *                counsellor the invoices without inventing a job title, and
 *                take one thing away from somebody without demoting them.
 *   4. Scope     how far they see: their own files, their office, or all of
 *                it. A separate question from what they may do with them.
 *
 * None of this is a screen check. Every page and every server action asks
 * before it reads or writes, because hiding a link is a courtesy, not a
 * control.
 */

export type Actor = {
  id: string;
  role: string;
  position?: string | null;
  dataScope?: string | null;
  isHeadOffice?: boolean;
};

export type Grant = { perm: string; allow: number };

/** The named exceptions for one person. */
export const overridesOf = (userId: string): Grant[] =>
  all<Grant>("SELECT perm, allow FROM user_permissions WHERE user_id = ?", userId);

/**
 * Setting one exception. `null` removes it, which is the only honest way to
 * say "no exception": a stored false would read as a refusal for ever, and
 * would keep refusing even after the person's position changed.
 */
export function setOverride(userId: string, perm: string, allow: boolean | null, setBy: string) {
  if (!isCapability(perm)) return;
  if (allow === null) {
    run("DELETE FROM user_permissions WHERE user_id = ? AND perm = ?", userId, perm);
    return;
  }
  run(
    `INSERT INTO user_permissions (user_id, perm, allow, set_by, updated_at) VALUES (?,?,?,?,?)
     ON CONFLICT(user_id, perm) DO UPDATE SET allow = excluded.allow, set_by = excluded.set_by,
       updated_at = excluded.updated_at`,
    userId, perm, allow ? 1 : 0, setBy, now(),
  );
}

/** Everything this person may do, after all the layers. */
export function capabilitiesFor(actor: Actor): Set<Capability> {
  if (actor.role === "super_admin") {
    return new Set(ROLE_CAPABILITIES.super_admin);
  }
  if (actor.role === "student") {
    return new Set(ROLE_CAPABILITIES.student);
  }
  if (actor.role !== "tenant_admin" && actor.role !== "counsellor") {
    return new Set();
  }

  const position = positionOf(actor.position ?? defaultPositionFor(actor.role));
  const set = new Set<Capability>(position.grants);

  for (const g of overridesOf(actor.id)) {
    if (!isCapability(g.perm)) continue;
    if (g.allow === 1) set.add(g.perm);
    else set.delete(g.perm);
  }
  return set;
}

export function can(actor: Actor, capability: Capability): boolean {
  return capabilitiesFor(actor).has(capability);
}

/**
 * How far this person sees.
 *
 * An explicit choice on the account wins. Otherwise a consultancy admin and
 * anybody sitting at head office keep what they have always had, which is
 * every office, and everyone else gets what their position says.
 */
export function seeFor(actor: Actor): DataScope {
  if (actor.role === "super_admin") return "all";
  const stored = actor.dataScope;
  if (stored === "own" || stored === "office" || stored === "all") return stored;
  if (actor.role === "tenant_admin") return "all";
  if (actor.isHeadOffice) return "all";
  return positionOf(actor.position ?? defaultPositionFor(actor.role)).scope;
}

/** The position and scope stored against an account, for screens that edit them. */
export const actorOf = (userId: string): Actor | null => {
  const row = one<{ id: string; role: string; position: string | null; data_scope: string | null }>(
    "SELECT id, role, position, data_scope FROM users WHERE id = ?", userId,
  );
  return row
    ? { id: row.id, role: row.role, position: row.position, dataScope: row.data_scope }
    : null;
};
