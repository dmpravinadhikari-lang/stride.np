"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/Icon";
import Link from "next/link";
import { inviteParent, revokeParentLink, type ParentState } from "@/modules/parents/actions";
import { Alert, Button, Card, Chip, Empty, Field, inputClass } from "@/components/ui";

const initial: ParentState = { ok: true };

type Row = {
  id: string; token: string; parentName: string; relation: string;
  hasCode: boolean; views: number; lastViewed: string | null; createdAt: string;
};

export function ParentLinks({
  staff, students, selected, selectedName, tenantName, links,
}: {
  staff: boolean;
  students: Array<{ id: string; name: string }>;
  selected: string; selectedName: string; tenantName: string;
  links: Row[];
}) {
  const [state, action, pending] = useActionState(inviteParent, initial);
  const [copied, setCopied] = useState<string | null>(null);

  const fullUrl = (token: string) =>
    typeof window === "undefined" ? `/p/${token}` : `${window.location.origin}/p/${token}`;

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(fullUrl(token));
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied("failed");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {staff && students.length > 1 && (
        <Card className="p-5">
          <Field label="Which student?" name="pick">
            <select
              id="pick" className={inputClass} defaultValue={selected}
              onChange={(e) => { window.location.href = `/app/parents?student=${e.target.value}`; }}
            >
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </Card>
      )}

      {state.token && (
        <Card className="border-teal-500/40 bg-teal-100/40 p-5">
          <h2 className="h-tight text-[16px] text-teal-700">{state.message}</h2>
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">The link</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-teal-500/30 bg-white px-3 py-2 font-mono text-[13px]">
                  {fullUrl(state.token)}
                </code>
                <Button type="button" size="sm" variant="secondary" onClick={() => copy(state.token!)}>
                  {copied === state.token ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            {state.code && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">The code, say it, do not send it</div>
                <div className="num mt-1 inline-block rounded-lg border border-teal-500/30 bg-white px-4 py-2 text-[22px] font-semibold tracking-[0.2em] text-ink">
                  {state.code}
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
                  Tell them this on the phone. If it travels in the same message as the link, it is
                  not protecting anything. It is not shown again.
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="h-tight text-[16px]">Invite a parent</h2>
        <p className="mt-1 text-[13px] text-muted">
          For {selectedName}. They open the link on their phone, no app, no account, no password.
        </p>
        {state.message && !state.ok && <div className="mt-3"><Alert tone="danger">{state.message}</Alert></div>}

        <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="student_id" value={selected} />
          <Field label="Their name" name="parent_name">
            <input id="parent_name" name="parent_name" required className={inputClass} placeholder="Ram Bahadur Gurung" />
          </Field>
          <Field label="Relation" name="relation">
            <select id="relation" name="relation" className={inputClass} defaultValue="Father">
              {["Father", "Mother", "Guardian", "Sponsor", "Brother", "Sister", "Uncle", "Aunt"].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Protect with a code?" name="use_code" hint="Recommended. Six digits you tell them by phone.">
            <select id="use_code" name="use_code" className={inputClass} defaultValue="1">
              <option value="1">Yes, require a code</option>
              <option value="0">No, anyone with the link can view</option>
            </select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={pending || !selected}>
              {pending ? "Creating…" : "Create link"}
            </Button>
          </div>
        </form>
      </Card>

      <section>
        <h2 className="h-tight text-[17px]">Links for {selectedName}</h2>
        {links.length === 0 ? (
          <div className="mt-3"><Empty icon={<Icon name="family" size={22} />} title="Nobody invited yet">
            In Nepal the person paying is rarely the person applying. A parent who can see progress
            asks the consultancy fewer anxious questions, and trusts the answer more.
          </Empty></div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {links.map((l) => (
              <Card key={l.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14.5px] font-semibold text-ink">{l.parentName}</span>
                    <Chip tone="grey">{l.relation}</Chip>
                    {l.hasCode ? <Chip tone="teal">Code protected</Chip> : <Chip tone="gold">No code</Chip>}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-muted">
                    {l.views === 0
                      ? "Not opened yet"
                      : `Opened ${l.views} time${l.views === 1 ? "" : "s"}, last ${new Date(l.lastViewed!).toLocaleString()}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/p/${l.token}`} target="_blank"
                    className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-ink-2 hover:border-brand-400 hover:text-brand-600">
                    Preview
                  </Link>
                  <Button type="button" size="sm" variant="secondary" onClick={() => copy(l.token)}>
                    {copied === l.token ? "Copied" : "Copy link"}
                  </Button>
                  <form action={revokeParentLink}>
                    <input type="hidden" name="id" value={l.id} />
                    <button type="submit" className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-muted hover:text-danger-600">
                      Revoke
                    </button>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <p className="text-[12px] leading-relaxed text-muted">
        Revoking a link kills it immediately, useful when a phone is lost or a relationship
        changes. {tenantName} staff and the student can both do it.
      </p>
    </div>
  );
}
