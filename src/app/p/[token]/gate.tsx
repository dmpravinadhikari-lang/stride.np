"use client";

import { useActionState } from "react";
import { unlock, type UnlockState } from "@/modules/parents/unlock";
import { Alert, Button, Field } from "@/components/ui";
import { Logo } from "@/components/Logo";

const initial: UnlockState = { ok: true };

export function CodeGate({ token, firstName }: { token: string; firstName: string }) {
  const [state, action, pending] = useActionState(unlock, initial);

  return (
    <main className="wash min-h-screen">
      <div className="mx-auto max-w-sm px-5 py-14">
        <Logo href="#" />
        <div className="mt-8 rounded-2xl border border-line bg-panel p-6">
          <h1 className="display text-[24px]">Namaste, {firstName}</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
            Enter the six-digit code the counsellor gave you on the phone, and you will see how the
            application is going.
          </p>

          <form action={action} className="mt-5 flex flex-col gap-4">
            <input type="hidden" name="token" value={token} />
            {state.message && <Alert tone="danger">{state.message}</Alert>}
            <Field label="Code" name="code">
              <input
                id="code" name="code" inputMode="numeric" autoComplete="one-time-code"
                required maxLength={6} autoFocus
                className="w-full rounded-xl border border-line-2 bg-white px-4 py-3 text-center font-mono text-[26px] tracking-[0.3em] text-ink focus:border-brand-400 focus:outline-none"
                placeholder="000000"
              />
            </Field>
            <Button type="submit" size="lg" disabled={pending} className="w-full">
              {pending ? "Checking…" : "Show me"}
            </Button>
          </form>
        </div>
        <p className="mt-5 text-center text-[12.5px] leading-relaxed text-muted">
          Do not have the code? Call the consultancy — they will read it to you. Never share this
          page with anyone else.
        </p>
      </div>
    </main>
  );
}
