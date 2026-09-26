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
  // What a personal mailbox types for itself, cleaned to what a subdomain can
  // actually be, so the preview under it is the truth and not a promise.
  const [address, setAddress] = useState("");
  const tidy = address.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 30);

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
          placeholder="Himalayan Pathways Education"
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
        <div className="-mt-1 flex flex-col gap-2.5 rounded-xl border border-accent-300 bg-accent-50 px-3.5 py-3">
          <p className="text-[13px] leading-snug text-ink-2">
            {domainOf(email)} is a personal mailbox, so choose the address your office should have.
            If you buy a domain later, we move you to it.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-semibold text-ink">Your address</span>
            <span className="flex items-center gap-1.5">
              <input
                name="address" value={address} onChange={(e) => setAddress(e.target.value)}
                className={`${inputClass} max-w-[190px]`} placeholder="himalayan" autoCapitalize="none"
              />
              <span className="text-[13.5px] text-muted">.{BRAND.domain}</span>
            </span>
          </label>
          {tidy.length >= 3 && (
            <p className="text-[12.5px] text-ink-2">
              Your office will be at <span className="font-medium text-ink">{tidy}.{BRAND.domain}</span>
            </p>
          )}
        </div>
      )}

      <Field label="Your full name" name="full_name">
        <input id="full_name" name="full_name" required className={inputClass} placeholder="Your name" />
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
        {pending ? "Setting up your consultancy…" : "Set up my consultancy"}
      </Button>
    </form>
  );
}
