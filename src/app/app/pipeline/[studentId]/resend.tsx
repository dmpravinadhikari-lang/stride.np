"use client";

import { useActionState, useState } from "react";
import { resendInvite } from "@/modules/pipeline/actions";
import type { PipelineState } from "@/modules/pipeline/actions";
import { Alert, Button, inputClass } from "@/components/ui";
import { Icon } from "@/components/Icon";

/**
 * Sending a student their sign-in details again.
 *
 * Three screens told staff to "resend from their file", and no screen had a
 * button. This is that button, and it does the two things an office actually
 * needs at the counter: correct the address if it was typed wrong, and show
 * the new password on screen, because the student is usually standing there
 * and the email will arrive after they have gone.
 */
export function ResendInvite({
  studentId, email, hasSignedIn,
}: {
  studentId: string;
  email: string;
  /** True once they have logged in at least once, when this is rarely needed. */
  hasSignedIn: boolean;
}) {
  const [state, act, pending] = useActionState<PipelineState, FormData>(resendInvite, { ok: true });
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-line bg-wash/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-ink">Getting in</div>
          <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
            {hasSignedIn
              ? `They have signed in before, using ${email}.`
              : `Their details went to ${email}. They have not signed in yet.`}
          </p>
        </div>
        <button
          type="button" onClick={() => setOpen((o) => !o)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-line-2 bg-panel px-3.5 text-[13px] font-semibold text-ink-2 hover:border-brand-400 hover:text-brand-600"
        >
          <Icon name="inbox" size={15} /> {open ? "Close" : "Send details again"}
        </button>
      </div>

      {state.password && (
        <div className="mt-3">
          <Alert tone="teal" title={state.message}>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <code className="rounded-lg border border-teal-500/30 bg-white px-3 py-2 font-mono text-[15px] font-semibold text-ink">
                {state.password}
              </code>
              <span className="text-[12.5px]">Read it out to them now. It is shown only once.</span>
            </div>
          </Alert>
        </div>
      )}

      {open && (
        <form action={act} className="mt-3 flex flex-col gap-2.5">
          <input type="hidden" name="student_id" value={studentId} />
          {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}
          <label className="text-[12.5px] font-semibold text-ink" htmlFor="resend_email">
            Send to
          </label>
          <input
            id="resend_email" name="email" type="email" defaultValue={email}
            className={inputClass}
          />
          <p className="text-[12px] leading-snug text-muted">
            A new password is made and the old one stops working. If the address here is wrong,
            correct it first: that is usually why nothing arrived.
          </p>
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Make a new password and send"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
