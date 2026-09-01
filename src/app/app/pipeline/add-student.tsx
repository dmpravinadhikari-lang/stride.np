"use client";

import { useActionState, useState } from "react";
import { addStudent, type PipelineState } from "@/modules/pipeline/actions";
import { Alert, Button, Card, Field, inputClass } from "@/components/ui";
import { COUNTRIES, COUNTRY_CODES } from "@/lib/countries";

const initial: PipelineState = { ok: true };

export function AddStudent() {
  const [state, action, pending] = useActionState(addStudent, initial);
  const [open, setOpen] = useState(false);

  return (
    <Card className="overflow-hidden">
      <button
        type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div>
          <h2 className="h-tight text-[16px]">Add a student</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Creates their login. Everything they do lands back on this board.
          </p>
        </div>
        <span className="text-[13px] font-semibold text-brand-600">{open ? "Close" : "Add"}</span>
      </button>

      {state.password && (
        <div className="border-t border-line px-5 py-4">
          <Alert tone="teal" title={state.message}>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <code className="rounded-lg border border-teal-500/30 bg-white px-3 py-2 font-mono text-[15px] font-semibold text-ink">
                {state.password}
              </code>
              <span className="text-[12.5px]">
                Write it down or send it to them now. It cannot be shown again — you would have to
                reset it.
              </span>
            </div>
          </Alert>
        </div>
      )}

      {open && (
        <form action={action} className="border-t border-line px-5 py-5">
          {state.message && !state.ok && <div className="mb-4"><Alert tone="danger">{state.message}</Alert></div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="full_name">
              <input id="full_name" name="full_name" required className={inputClass} placeholder="Sujata Gurung" />
            </Field>
            <Field label="Email" name="email" hint="They log in with this.">
              <input id="email" name="email" type="email" required className={inputClass} placeholder="student@example.com" />
            </Field>
            <Field label="Mobile" name="phone">
              <input id="phone" name="phone" className={inputClass} placeholder="98xxxxxxxx" />
            </Field>
            <Field label="How did they find you?" name="source">
              <input id="source" name="source" className={inputClass} placeholder="Walk-in, referral, Facebook…" />
            </Field>
            <Field label="Target country" name="target_country" hint="They can change this themselves later.">
              <select id="target_country" name="target_country" className={inputClass} defaultValue="">
                <option value="">Not decided</option>
                {COUNTRY_CODES.map((c) => (
                  <option key={c} value={c}>{COUNTRIES[c].flag} {COUNTRIES[c].name}</option>
                ))}
              </select>
            </Field>
            <Field label="Intended course" name="intended_course">
              <input id="intended_course" name="intended_course" className={inputClass} placeholder="Master of Information Technology" />
            </Field>
          </div>

          <div className="mt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create student account"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
