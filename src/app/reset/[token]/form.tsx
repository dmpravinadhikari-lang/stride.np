"use client";

import Link from "next/link";
import { useActionState } from "react";
import { setNewPassword, type ResetFormState } from "@/lib/auth/reset-actions";
import { Alert, Button, Field, inputClass } from "@/components/ui";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetFormState, FormData>(setNewPassword, { ok: true });

  if (state.done) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="teal" title="Password set">
          {state.message} Everywhere else this account was signed in has been signed out.
        </Alert>
        <Link
          href="/login"
          className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-brand-500 px-5 text-[15px] font-semibold text-white hover:bg-brand-600"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}
      <Field label="New password" name="password" hint="At least 8 characters.">
        <input
          id="password" name="password" type="password" autoComplete="new-password"
          required minLength={8} autoFocus className={inputClass} placeholder="••••••••"
        />
      </Field>
      <Field label="Type it again" name="again">
        <input
          id="again" name="again" type="password" autoComplete="new-password"
          required minLength={8} className={inputClass} placeholder="••••••••"
        />
      </Field>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Setting…" : "Set my password"}
      </Button>
    </form>
  );
}
