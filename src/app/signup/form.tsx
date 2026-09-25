"use client";

import { useActionState, useState } from "react";
import { signup, type AuthState } from "@/lib/auth/actions";
import { Alert, Button, Field, inputClass } from "@/components/ui";

const initial: AuthState = { ok: true };

import { BRAND } from "@/lib/brand";
import { domainOf, isPersonalEmail, slugFromEmail } from "@/lib/auth/work-email";

/**
 * Setting up a consultancy. There is no student option any more: a student's
 * account is opened by the consultancy advising them, so the tab that used to
 * offer one has gone rather than being left in place to fail on submit.
 */
export function SignupForm() {
  const [state, action, pending] = useActionState(signup, initial);
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  // The address comes from the work email, so the preview follows what is
  // typed there rather than the consultancy's legal name.
  const slug = slugFromEmail(email);
  const personal = email.includes("@") && isPersonalEmail(email);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.message && <Alert tone="danger">{state.message}</Alert>}

      <Field
        label="Consultancy name"
        name="org_name"
        hint="As you want it printed on letters and payslips."
      >
        <input
          id="org_name" name="org_name" required className={inputClass}
          placeholder="Happy Panda Education"
          value={org} onChange={(e) => setOrg(e.target.value)}
        />
      </Field>

      {slug && !personal && (
        <div className="-mt-1 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-brand-700">
            Your office will be at
          </div>
          <div className="mt-0.5 truncate text-[15px] font-medium text-ink">
            {slug}.{BRAND.domain}
          </div>
        </div>
      )}

      {personal && (
        <div className="-mt-1 rounded-xl border border-accent-300 bg-accent-50 px-3.5 py-2.5 text-[13px] text-ink-2">
          Use your consultancy&rsquo;s own email, not {domainOf(email)}. The domain becomes your
          address, and it keeps the account with the office rather than with one person.
        </div>
      )}

      <Field label="Your full name" name="full_name">
        <input id="full_name" name="full_name" required className={inputClass} placeholder="Pravin Adhikari" />
      </Field>
      <Field label="Work email" name="email" hint="Your consultancy's own domain. This becomes your address.">
        <input
          id="email" name="email" type="email" autoComplete="email" required className={inputClass}
          placeholder="you@yourconsultancy.com.np"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
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
