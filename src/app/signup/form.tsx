"use client";

import { useActionState, useState } from "react";
import { signup, type AuthState } from "@/lib/auth/actions";
import { Alert, Button, Field, inputClass } from "@/components/ui";

const initial: AuthState = { ok: true };

const slugPreview = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

/**
 * Setting up a consultancy. There is no student option any more: a student's
 * account is opened by the consultancy advising them, so the tab that used to
 * offer one has gone rather than being left in place to fail on submit.
 */
export function SignupForm() {
  const [state, action, pending] = useActionState(signup, initial);
  const [org, setOrg] = useState("");
  const slug = slugPreview(org);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.message && <Alert tone="danger">{state.message}</Alert>}

      <Field
        label="Consultancy name"
        name="org_name"
        hint="This becomes your own address, which is where your students sign in."
      >
        <input
          id="org_name" name="org_name" required className={inputClass}
          placeholder="Happy Panda Education"
          value={org} onChange={(e) => setOrg(e.target.value)}
        />
      </Field>

      {slug && (
        <div className="-mt-1 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand-700">
            Your students will sign in at
          </div>
          <div className="num mt-0.5 truncate text-[14px] font-semibold text-ink">
            {slug}.stride.np
          </div>
        </div>
      )}

      <Field label="Your full name" name="full_name">
        <input id="full_name" name="full_name" required className={inputClass} placeholder="Pravin Adhikari" />
      </Field>
      <Field label="Work email" name="email">
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} placeholder="you@yourconsultancy.com.np" />
      </Field>
      <Field label="Mobile" name="phone" hint="Optional. Used later for deadline alerts.">
        <input id="phone" name="phone" className={inputClass} placeholder="98xxxxxxxx" />
      </Field>
      <Field label="Password" name="password" hint="At least 8 characters.">
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className={inputClass} placeholder="••••••••" />
      </Field>

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? "Setting up your branch…" : "Set up my branch"}
      </Button>
    </form>
  );
}
