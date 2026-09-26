"use client";

import { useActionState } from "react";
import { clearPin, setPin, type PinState } from "@/modules/kiosk/actions";
import { Alert, Button, Card, Field, inputClass } from "@/components/ui";

const initial: PinState = { ok: true };

/**
 * Your clock-in PIN.
 *
 * Four to six digits, hashed like a password and readable by nobody
 * afterwards, including the owner. It works the clock at the front desk and
 * nothing else: it cannot open the console, a student file or a payslip.
 */
export function PinSettings({ hasPin }: { hasPin: boolean }) {
  const [state, action, pending] = useActionState(setPin, initial);

  return (
    <Card className="p-5">
      <h2 className="h-tight text-[17px]">Your clock-in PIN</h2>
      <p className="mt-1 text-[13.5px] text-muted">
        For the shared tablet at the front desk, so you do not type a password at the counter. It
        works the clock and nothing else.
      </p>

      {state.message && <div className="mt-3"><Alert tone={state.ok ? "teal" : "danger"}>{state.message}</Alert></div>}

      <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
        <Field label={hasPin ? "Change it" : "Choose one"} name="pin" hint="Four to six digits.">
          <input
            id="pin" name="pin" inputMode="numeric" pattern="\d{4,6}" maxLength={6} required
            autoComplete="off" className={`${inputClass} w-[180px]`} placeholder="••••"
          />
        </Field>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : hasPin ? "Change PIN" : "Set PIN"}</Button>
      </form>

      {hasPin && (
        <form action={clearPin} className="mt-3">
          <button type="submit" className="min-h-[36px] text-[13px] font-medium text-muted hover:text-danger-600">
            Remove my PIN
          </button>
        </form>
      )}
    </Card>
  );
}
