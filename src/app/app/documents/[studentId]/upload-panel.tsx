"use client";

import { useActionState, useRef, useState } from "react";
import { uploadDocument, type DocState } from "@/modules/documents/actions";
import { Alert, Button, Card, Field, inputClass } from "@/components/ui";

const initial: DocState = { ok: true };

export function UploadPanel({
  studentId, required,
}: { studentId: string; required: Array<{ id: string; label: string; sensitive: boolean }> }) {
  const [state, action, pending] = useActionState(uploadDocument, initial);
  const [kind, setKind] = useState(required[0]?.id ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const sensitive = required.find((r) => r.id === kind)?.sensitive;

  return (
    <Card className="p-5">
      <h2 className="h-tight text-[16px]">Upload a document</h2>
      <p className="mt-1 text-[13px] text-muted">
        PDF or a clear photo, up to 8 MB. Photograph the whole page in daylight — a cropped or dark
        scan is the most common reason a document is sent back.
      </p>

      {state.message && (
        <div className="mt-4"><Alert tone={state.ok ? "teal" : "danger"}>{state.message}</Alert></div>
      )}

      <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="student_id" value={studentId} />
        <Field label="What is it?" name="kind">
          <select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={inputClass}>
            {required.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="File" name="file" hint={sensitive ? `Sensitive — deletes itself in 90 days unless kept.` : undefined}>
          <input
            ref={fileRef} id="file" name="file" type="file" required
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
            className="w-full rounded-xl border border-line-2 bg-white px-3.5 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-brand-700"
          />
        </Field>
        <Field label="Note" name="label" hint="Optional — e.g. which bank, or which year.">
          <input id="label" name="label" className={inputClass} placeholder="NIC Asia, last 12 months" />
        </Field>
        <div className="flex items-end">
          <Button type="submit" disabled={pending}>{pending ? "Uploading…" : "Upload"}</Button>
        </div>
      </form>
    </Card>
  );
}
