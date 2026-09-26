"use client";

import { useActionState } from "react";
import { changePassword, saveMyDetails, signOutEverywhereElse, type AccountState } from "@/modules/account/actions";
import { Alert, Button, Card, Field, inputClass } from "@/components/ui";
import { Icon } from "@/components/Icon";

const initial: AccountState = { ok: true };

/** Name and number, the two things that change when somebody marries or moves. */
export function MyDetails({
  fullName, phone, email, role, office,
}: { fullName: string; phone: string | null; email: string; role: string; office: string }) {
  const [state, action, pending] = useActionState(saveMyDetails, initial);

  return (
    <Card className="p-5">
      <h2 className="h-tight text-[17px]">Your details</h2>
      <p className="mt-1 text-[13.5px] text-muted">{role} · {office}</p>
      {state.message && <div className="mt-3"><Alert tone={state.ok ? "teal" : "danger"}>{state.message}</Alert></div>}
      <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Full name" name="me_name">
          <input id="me_name" name="full_name" required defaultValue={fullName} className={inputClass} />
        </Field>
        <Field label="Mobile" name="me_phone">
          <input id="me_phone" name="phone" defaultValue={phone ?? ""} className={inputClass} placeholder="98xxxxxxxx" />
        </Field>
        <Field label="Email" name="me_email" hint="This is how you sign in. Ask an admin to change it.">
          <input id="me_email" value={email} readOnly disabled className={`${inputClass} bg-wash text-muted`} />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        </div>
      </form>
    </Card>
  );
}

/** Changing your password, which nothing in the product allowed until now. */
export function PasswordCard({ google, otherSessions }: { google: boolean; otherSessions: number }) {
  const [state, action, pending] = useActionState(changePassword, initial);

  return (
    <Card className="p-5">
      <h2 className="h-tight text-[17px]">Password</h2>

      {google ? (
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          You sign in with Google, so there is no password here to change. Change it with Google
          and this account follows.
        </p>
      ) : (
        <>
          <p className="mt-1 text-[13.5px] text-muted">
            Changing it signs you out everywhere else, which is the point of changing it.
          </p>
          {state.message && <div className="mt-3"><Alert tone={state.ok ? "teal" : "danger"}>{state.message}</Alert></div>}
          <form action={action} className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Current password" name="pw_current">
              <input id="pw_current" name="current" type="password" autoComplete="current-password" required className={inputClass} />
            </Field>
            <Field label="New password" name="pw_next" hint="At least 8 characters.">
              <input id="pw_next" name="next" type="password" autoComplete="new-password" required minLength={8} className={inputClass} />
            </Field>
            <Field label="New password again" name="pw_again">
              <input id="pw_again" name="again" type="password" autoComplete="new-password" required minLength={8} className={inputClass} />
            </Field>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={pending}>{pending ? "Changing…" : "Change password"}</Button>
            </div>
          </form>
        </>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <Icon name="lock" size={16} className="text-muted" />
        <span className="text-[13.5px] text-ink-2">
          {otherSessions === 0
            ? "You are not signed in anywhere else."
            : `Signed in on ${otherSessions} other ${otherSessions === 1 ? "device" : "devices"}.`}
        </span>
        {otherSessions > 0 && (
          <form action={signOutEverywhereElse} className="ml-auto">
            <Button type="submit" variant="secondary" size="sm">Sign out everywhere else</Button>
          </form>
        )}
      </div>
    </Card>
  );
}
