"use client";

import { useActionState } from "react";
import { askForReset, type ResetFormState } from "@/lib/auth/reset-actions";
import { Alert, Button, Field, inputClass } from "@/components/ui";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ResetFormState, FormData>(askForReset, { ok: true });

  if (state.done) {
    return (
      <Alert tone="teal" title="Check your email">
        If that address has an account with us, a link to set a new password is on its way. It can
        take a minute. Look in spam if it is not there.
      </Alert>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}
      <Field label="Email" name="email">
        <input
          id="email" name="email" type="email" autoComplete="email" required autoFocus
          className={inputClass} placeholder="you@yourconsultancy.com.np"
        />
      </Field>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send me a link"}
      </Button>
    </form>
  );
}
