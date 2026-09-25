"use client";

import { useActionState } from "react";
import { setUpDevice, signOutDevice, type DeviceState } from "@/modules/kiosk/actions";
import { Alert, Button, Field, inputClass } from "@/components/ui";

const initial: DeviceState = { ok: true };

/**
 * Binding the tablet you are standing at to one office.
 *
 * Deliberately done from the device itself rather than by typing a code from
 * elsewhere: the cookie has to land on the machine that will sit at the desk,
 * and a manager holding that machine is the authorisation.
 */
export function DeviceSetup({
  branches, enrolled,
}: { branches: Array<{ id: string; name: string }>; enrolled: { branchName: string; label: string } | null }) {
  const [state, action, pending] = useActionState(setUpDevice, initial);

  if (enrolled) {
    return (
      <div className="flex flex-col gap-3">
        <Alert tone="teal" title="This device is already a clock">
          It is the clock for {enrolled.branchName}, labelled &ldquo;{enrolled.label}&rdquo;. Open{" "}
          <span className="font-medium">/kiosk</span> on it and leave it on that page.
        </Alert>
        <form action={signOutDevice}>
          <Button type="submit" variant="danger" size="sm">Stop using this device as a clock</Button>
        </form>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.message && <Alert tone={state.ok ? "teal" : "danger"}>{state.message}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Which office is this device in?" name="kiosk_branch">
          <select id="kiosk_branch" name="branch_id" className={inputClass} defaultValue={branches[0]?.id ?? ""}>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="What to call it" name="kiosk_label" hint="So you know which tablet this is later.">
          <input id="kiosk_label" name="label" className={inputClass} placeholder="Front desk" defaultValue="Front desk" />
        </Field>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Setting up…" : "Use this device as the clock"}
        </Button>
      </div>
    </form>
  );
}
