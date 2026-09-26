"use client";

import { useActionState, useEffect, useState } from "react";
import { addStudent, type PipelineState } from "@/modules/pipeline/actions";
import { Alert, Button, Card, Field, inputClass } from "@/components/ui";
import { COUNTRIES, COUNTRY_CODES } from "@/lib/countries";
import { SOURCES, SOURCE_IDS } from "@/modules/pipeline/sources";

const initial: PipelineState = { ok: true };

const OPEN_EVENT = "stride:add-student";

/** The page-header button. Opens a fresh form below, wherever it sits. */
export function AddStudentButton() {
  return (
    <a
      href="/app/pipeline?add=1#add-student"
      onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event(OPEN_EVENT)); }}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
      Add student
    </a>
  );
}

export function AddStudent({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  // Each press starts a new form, so the last student's login is never in the way.
  const [round, setRound] = useState(0);

  useEffect(() => {
    const onOpen = () => {
      setRound((r) => r + 1);
      setOpen(true);
      requestAnimationFrame(() => {
        document.getElementById("add-student")?.scrollIntoView({ behavior: "smooth", block: "start" });
        document.getElementById("full_name")?.focus();
      });
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  if (!open) return null;
  return <AddStudentForm key={round} onClose={() => setOpen(false)} onAnother={() => setRound((r) => r + 1)} />;
}

function AddStudentForm({ onClose, onAnother }: { onClose: () => void; onAnother: () => void }) {
  const [state, action, pending] = useActionState(addStudent, initial);

  return (
    <div id="add-student" className="scroll-mt-6">
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <span>
          <span className="h-tight block text-[16px]">Add a student</span>
          <span className="block text-[13px] text-muted">Creates their login and emails it to them.</span>
        </span>
        <button type="button" onClick={onClose} className="min-h-[40px] rounded-full px-3 text-[13px] font-semibold text-muted hover:bg-wash hover:text-ink">
          Close
        </button>
      </div>

      {state.password && (
        <div className="border-t border-line px-5 py-4">
          <Alert tone="teal" title={state.message}>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <code className="rounded-lg border border-teal-500/30 bg-white px-3 py-2 font-mono text-[15px] font-semibold text-ink">
                {state.password}
              </code>
              <span className="text-[12.5px]">
                It is also in their email. It will not be shown again.
              </span>
            </div>
            <div className="mt-3">
              <Button type="button" variant="secondary" size="sm" onClick={onAnother}>Add another student</Button>
            </div>
          </Alert>
        </div>
      )}

      {!state.password && (
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
            <Field label="How did they find you?" name="source" hint="This is what the channel report is built from.">
              <select id="source" name="source" className={inputClass} defaultValue="walk_in">
                {SOURCE_IDS.map((id) => (
                  <option key={id} value={id}>{SOURCES[id].label}</option>
                ))}
              </select>
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
    </div>
  );
}
