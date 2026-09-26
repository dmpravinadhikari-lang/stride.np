"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/Icon";
import { setException, setPosition, type AccessState } from "@/modules/access/actions";
import { inputClass } from "@/components/ui";

/**
 * Picking somebody's job, and how far they see.
 *
 * The two are one form because they are one decision in an owner's head:
 * "she runs Pokhara" is a position and a scope at the same time. Choosing a
 * position moves the scope to that job's usual answer, and the second box is
 * there for the office where it is not.
 */
export function PositionForm({
  userId, name, position, dataScope, positions,
}: {
  userId: string;
  name: string;
  position: string;
  dataScope: string;
  positions: Array<{ id: string; label: string; blurb: string; scope: string }>;
}) {
  const [state, act, pending] = useActionState<AccessState, FormData>(setPosition, { ok: true });
  const [picked, setPicked] = useState(position);
  const [scope, setScope] = useState(dataScope);
  const chosen = positions.find((p) => p.id === picked);

  return (
    <form action={act} className="flex flex-col gap-3">
      <input type="hidden" name="user_id" value={userId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink">What {name.split(" ")[0]} does here</span>
          <select
            name="position" value={picked}
            onChange={(e) => { setPicked(e.target.value); setScope(""); }}
            className={inputClass}
          >
            {positions.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          {chosen && <span className="text-[12px] leading-snug text-muted">{chosen.blurb}</span>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink">How far they see</span>
          <select name="data_scope" value={scope} onChange={(e) => setScope(e.target.value)} className={inputClass}>
            <option value="">
              Whatever the job usually means{chosen ? ` (${chosen.scope === "all" ? "every office" : chosen.scope === "office" ? "their office" : "their own files"})` : ""}
            </option>
            <option value="own">Only their own files and enquiries</option>
            <option value="office">Their office</option>
            <option value="all">Every office</option>
          </select>
          <span className="text-[12px] leading-snug text-muted">
            Narrowing this hides other people&apos;s students from the board, not just from a link.
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-brand-500 px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          {pending ? "Saving" : "Save the position"}
        </button>
        {state.message && (
          <span className={`text-[12.5px] ${state.ok ? "text-teal-700" : "text-danger-600"}`} role="status">
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}

/**
 * One capability, in three states.
 *
 * Following the position is the normal state and reads as a plain tick or a
 * dash. An exception is drawn as an exception, because a grant nobody
 * remembers making is how an office ends up with a receptionist who can open
 * payroll.
 */
export function ExceptionToggle({
  userId, perm, label, fromPosition, state,
}: {
  userId: string;
  perm: string;
  label: string;
  fromPosition: boolean;
  state: "inherit" | "allow" | "deny";
}) {
  const effective = state === "allow" ? true : state === "deny" ? false : fromPosition;
  // Pressing it walks: what the job says, then the opposite, then back.
  const next = state === "inherit" ? (fromPosition ? "deny" : "allow") : "inherit";

  return (
    <form action={setException}>
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="perm" value={perm} />
      <input type="hidden" name="state" value={next} />
      <button
        type="submit"
        className={`flex w-full items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors ${
          state !== "inherit"
            ? "border-accent-500/50 bg-accent-50"
            : "border-line bg-panel hover:bg-wash/60"
        }`}
      >
        <span
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
            effective ? "border-teal-500 bg-teal-500 text-white" : "border-line-2 text-transparent"
          }`}
          aria-hidden
        >
          <Icon name="check" size={12} />
        </span>
        <span className="min-w-0">
          <span className={`block text-[12.5px] leading-snug ${effective ? "text-ink" : "text-muted"}`}>
            {label}
          </span>
          {state !== "inherit" && (
            <span className="mt-0.5 block text-[11.5px] font-semibold text-accent-600">
              {state === "allow" ? "Granted to this person" : "Refused to this person"}
              {" · press to follow the job again"}
            </span>
          )}
        </span>
      </button>
    </form>
  );
}
