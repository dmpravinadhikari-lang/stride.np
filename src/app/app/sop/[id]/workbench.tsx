"use client";

import { useActionState, useState } from "react";
import { generateDraft, reviewDoc, reviseDoc, saveEdit, type ActionState } from "@/modules/sop-studio/actions";
import { Alert, Button, Card, Chip, inputClass } from "@/components/ui";

const initial: ActionState = { ok: true };

type Version = { id: string; no: number; source: string; words: number; note: string | null; at: string };

const SOURCE_LABEL: Record<string, string> = {
  ai_draft: "AI draft", student_edit: "Your edit", ai_revision: "AI revision",
};

export function SopWorkbench({
  docId, body, versions, hasDraft,
}: { docId: string; body: string; versions: Version[]; hasDraft: boolean }) {
  const [text, setText] = useState(body);
  const [draftState, draftAction, drafting] = useActionState(generateDraft, initial);
  const [saveState, saveAction, saving] = useActionState(saveEdit, initial);
  const [reviewState, reviewAction, reviewing] = useActionState(reviewDoc, initial);
  const [reviseState, reviseAction, revising] = useActionState(reviseDoc, initial);

  const busy = drafting || saving || reviewing || revising;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const latest = [draftState, saveState, reviewState, reviseState].find((s) => s.message);

  return (
    <div className="flex flex-col gap-4">
      {latest?.message && (
        <Alert tone={latest.ok ? "teal" : "danger"}>{latest.message}</Alert>
      )}

      {!hasDraft && (
        <Card className="p-5">
          <h2 className="h-tight text-[16px]">Nothing written yet</h2>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
            Either have STRIDE build a first draft from your profile, or paste what you've already
            written into the editor below and score it. Pasting your own is the more useful route.
          </p>
          <form action={draftAction} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="id" value={docId} />
            <textarea
              name="notes" rows={2} className={inputClass}
              placeholder="Anything specific you want included? A project, a professor's name, a family circumstance…"
            />
            <div>
              <Button type="submit" disabled={busy}>
                {drafting ? "Writing your draft…" : "Write a first draft (3 credits)"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-wash/60 px-5 py-3">
          <h2 className="h-tight text-[15px]">Your statement</h2>
          <div className="flex items-center gap-3">
            <span className="num text-[12px] text-muted">{words} words</span>
            {words > 0 && words < 400 && <Chip tone="gold">Short for most applications</Chip>}
          </div>
        </div>

        <form action={saveAction}>
          <input type="hidden" name="id" value={docId} />
          <textarea
            name="body" value={text} onChange={(e) => setText(e.target.value)}
            rows={20} spellCheck
            className="w-full resize-y border-0 bg-white px-5 py-4 font-sans text-[15px] leading-[1.75] text-ink placeholder:text-muted/60 focus:outline-none"
            placeholder={"Paste your statement here, or use the draft button above.\n\nUse ## before a line to mark it as a section heading."}
          />
          <div className="flex flex-wrap items-center gap-2 border-t border-line bg-wash/40 px-5 py-3">
            <Button type="submit" variant="secondary" size="sm" disabled={busy || text.trim().length < 40}>
              {saving ? "Saving…" : "Save as new version"}
            </Button>
            <span className="text-[12px] text-muted">Every save is kept, so you can always go back.</span>
          </div>
        </form>
      </Card>

      <div className="flex flex-wrap gap-2">
        <form action={reviewAction}>
          <input type="hidden" name="id" value={docId} />
          <Button type="submit" disabled={busy || !hasDraft}>
            {reviewing ? "Assessing…" : "Score this statement (2 credits)"}
          </Button>
        </form>
        <form action={reviseAction}>
          <input type="hidden" name="id" value={docId} />
          <Button type="submit" variant="secondary" disabled={busy || !hasDraft}>
            {revising ? "Revising…" : "Rewrite addressing the problems (2 credits)"}
          </Button>
        </form>
        {hasDraft && (
          <form action={draftAction}>
            <input type="hidden" name="id" value={docId} />
            <Button type="submit" variant="ghost" disabled={busy}>
              {drafting ? "Writing…" : "Start a fresh draft"}
            </Button>
          </form>
        )}
      </div>

      {versions.length > 0 && (
        <Card className="p-5">
          <h2 className="h-tight text-[15px]">Version history</h2>
          <ul className="mt-3 flex flex-col divide-y divide-line">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-4 py-2.5">
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold text-ink">
                    v{v.no} · {SOURCE_LABEL[v.source] ?? v.source}
                  </div>
                  <div className="text-[12px] text-muted">
                    {v.note ? `${v.note} · ` : ""}{new Date(v.at).toLocaleString()}
                  </div>
                </div>
                <span className="num shrink-0 text-[12px] text-muted">{v.words} words</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
