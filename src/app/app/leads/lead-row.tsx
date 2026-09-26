"use client";

import { useActionState, useState } from "react";
import { convertLead, setLeadState, takeLead, type ConvertState } from "@/modules/leads/actions";
import { Alert, Button, Chip, inputClass, type Tone } from "@/components/ui";
import { Icon } from "@/components/Icon";

const initial: ConvertState = { ok: true };

const TONE: Record<string, Tone> = { hot: "danger", warm: "accent", cold: "sky" };

type Row = {
  id: string; full_name: string; phone: string; email: string | null;
  destination: string | null; study_level: string | null; intake: string | null;
  english_test: string | null; note: string | null; owner_name: string | null;
  owner_id: string | null; status: string; branch_name: string | null; channel: string;
  sourceLabel: string; priorityLabel: string | null; priority: string | null; follow_up_on: string | null;
  when: string; followUpText: string | null; student_id: string | null;
};

/**
 * One enquiry, and the three things anybody does to it.
 *
 * Ring them, say how it went, or open a student file. The phone number is a
 * tel: link because the person reading this is usually holding a phone, and
 * the detail only unfolds when asked for: a list of twenty enquiries each
 * showing ten fields is a list nobody scans.
 */
export function LeadRow({ lead, meId, canConvert }: { lead: Row; meId: string; canConvert: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, convert, converting] = useActionState(convertLead, initial);

  const facts = [lead.destination, lead.study_level, lead.intake, lead.english_test].filter(Boolean).join(" · ");

  return (
    <li className="px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14.5px] font-medium text-ink">{lead.full_name}</span>
            {lead.priorityLabel && <Chip tone={TONE[lead.priority ?? ""] ?? "grey"}>{lead.priorityLabel}</Chip>}
            {lead.status === "converted" && <Chip tone="teal">Student</Chip>}
            {lead.status === "lost" && <Chip tone="grey">Lost</Chip>}
            {lead.channel === "online" && <Chip tone="sky">Online</Chip>}
          </div>
          <div className="mt-0.5 text-[13px] text-muted">
            {[facts, lead.branch_name, lead.sourceLabel, lead.when].filter(Boolean).join(" · ")}
          </div>
        </div>

        <a
          href={`tel:${lead.phone.replace(/\s/g, "")}`}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-line-2 px-3.5 text-[13.5px] font-medium text-ink hover:border-brand-400 hover:text-brand-600"
        >
          <Icon name="user" size={15} /> {lead.phone}
        </a>

        {lead.followUpText && (
          <span className="text-[12.5px] text-muted">Ring back {lead.followUpText}</span>
        )}

        {lead.status !== "converted" && (
          lead.owner_id ? (
            <span className="text-[12.5px] text-muted">{lead.owner_id === meId ? "Yours" : lead.owner_name}</span>
          ) : (
            <form action={takeLead}>
              <input type="hidden" name="id" value={lead.id} />
              {/* Secondary, because this button repeats on every unclaimed
                  row. A colour that appears four times in a list is not
                  telling you which thing to press. */}
              <Button type="submit" size="sm" variant="secondary">I will take it</Button>
            </form>
          )
        )}

        <button
          type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
          className="inline-flex min-h-[38px] items-center gap-1 rounded-full px-3 text-[13px] font-medium text-brand-600 hover:bg-brand-50"
        >
          {open ? "Close" : "Details"}
        </button>
      </div>

      {open && (
        <div className="mt-3 grid gap-4 rounded-xl border border-line bg-wash/60 p-4 lg:grid-cols-2">
          <div>
            {lead.note && <p className="text-[13.5px] leading-relaxed text-ink-2">{lead.note}</p>}
            {lead.email && <p className="mt-2 text-[13px] text-muted">{lead.email}</p>}

            {lead.status !== "converted" && (
              <form action={setLeadState} className="mt-4 flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={lead.id} />
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-medium text-ink">How warm?</span>
                  <select name="priority" defaultValue={lead.priority ?? ""} className={`${inputClass} w-auto`}>
                    <option value="">Not said</option>
                    <option value="hot">Hot, chase this week</option>
                    <option value="warm">Warm, real but not in a hurry</option>
                    <option value="cold">Cold, went quiet</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-medium text-ink">Ring back on</span>
                  <input type="date" name="follow_up_on" defaultValue={lead.follow_up_on ?? ""} className={`${inputClass} w-auto`} />
                </label>
                <Button type="submit" variant="secondary" size="sm">Save</Button>
                <button
                  type="submit" name="status" value="lost"
                  className="min-h-[36px] rounded-full px-3 text-[13px] font-medium text-muted hover:text-danger-600"
                >
                  Mark lost
                </button>
              </form>
            )}
          </div>

          {canConvert && lead.status !== "converted" && (
            <form action={convert} className="rounded-xl border border-line bg-panel p-4">
              <input type="hidden" name="id" value={lead.id} />
              <div className="text-[13.5px] font-medium text-ink">Open a student file</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                This creates their login and moves them onto the student board. An email address is
                needed for that, and not before.
              </p>
              {state.message && (
                <div className="mt-3">
                  <Alert tone={state.ok ? "teal" : "danger"}>{state.message}</Alert>
                </div>
              )}
              {state.password && (
                <code className="mt-2 block rounded-lg border border-teal-500/30 bg-white px-3 py-2 font-mono text-[14px] font-medium text-ink">
                  {state.password}
                </code>
              )}
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-[12px] font-medium text-ink">Their email</span>
                  <input name="email" type="email" defaultValue={lead.email ?? ""} required className={inputClass} placeholder="student@example.com" />
                </label>
                <Button type="submit" disabled={converting}>{converting ? "Creating…" : "Make a student"}</Button>
              </div>
            </form>
          )}
        </div>
      )}
    </li>
  );
}
