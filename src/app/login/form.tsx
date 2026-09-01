"use client";

import { useActionState } from "react";
import { login, type AuthState } from "@/lib/auth/actions";
import { Alert, Button, Field, inputClass } from "@/components/ui";

const initial: AuthState = { ok: true };

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.message && <Alert tone="danger">{state.message}</Alert>}
      <Field label="Email" name="email">
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} placeholder="you@example.com" />
      </Field>
      <Field label="Password" name="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} placeholder="••••••••" />
      </Field>
      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? "Checking…" : "Log in"}
      </Button>
    </form>
  );
}
