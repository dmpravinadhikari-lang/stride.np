"use client";

import { useActionState, useState } from "react";
import { addStaffMember, type StaffState } from "@/modules/staff/actions";
import { Alert, Button, Card, Field, inputClass } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { POSITIONS } from "@/lib/auth/positions";

const initial: StaffState = { ok: true };

export function AddStaff({ branches }: { branches: Array<{ id: string; name: string }> }) {
  const [state, action, pending] = useActionState(addStaffMember, initial);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState("counsellor");

  return (
    <Card className="overflow-hidden">
      <button
        type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon name="plus" /></span>
          <span>
            <span className="h-tight block text-[16px]">Add a staff member</span>
            <span className="block text-[13px] text-muted">They get their own login.</span>
          </span>
        </span>
        <span className="text-[13px] font-semibold text-brand-600">{open ? "Close" : "Open"}</span>
      </button>

      {state.password && (
        <div className="border-t border-line px-5 py-4">
          <Alert tone="teal" title={state.message}>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <code className="rounded-lg border border-teal-500/30 bg-white px-3 py-2 font-mono text-[15px] font-semibold text-ink">
                {state.password}
              </code>
              <span className="text-[12.5px]">Give it to them now. It is shown only once.</span>
            </div>
          </Alert>
        </div>
      )}

      {open && (
        <form action={action} className="border-t border-line px-5 py-5">
          {state.message && !state.ok && <div className="mb-4"><Alert tone="danger">{state.message}</Alert></div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="staff_full_name">
              <input id="staff_full_name" name="full_name" required className={inputClass} placeholder="Nisha Thapa" />
            </Field>
            <Field label="Email" name="staff_email" hint="They log in with this.">
              <input id="staff_email" name="email" type="email" required className={inputClass} placeholder="name@yourconsultancy.com" />
            </Field>
            <Field label="Mobile" name="staff_phone">
              <input id="staff_phone" name="phone" className={inputClass} placeholder="98xxxxxxxx" />
            </Field>
            <Field label="Office" name="staff_branch">
              <select id="staff_branch" name="branch_id" className={inputClass} defaultValue={branches[0]?.id ?? ""}>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            {/*
              The job, not a permission level.
              
              This used to offer two words, counsellor or admin, which meant a
              receptionist was hired as a counsellor and could open a family's
              bank statement on their first morning. Picking the job they were
              actually hired for is one choice, and it is right.
            */}
            <Field
              label="What is their job?" name="staff_position"
              hint={POSITIONS.find((x) => x.id === position)?.blurb ?? ""}
            >
              <select
                id="staff_position" name="position" className={inputClass}
                value={position} onChange={(e) => setPosition(e.target.value)}
              >
                {POSITIONS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-5">
            <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create login"}</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
