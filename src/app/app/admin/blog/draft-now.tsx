"use client";

import { useActionState, useState } from "react";
import { draftNow, type BlogState } from "@/modules/blog/actions";
import { Alert, Button, Card, Field, inputClass } from "@/components/ui";

const initial: BlogState = { ok: true };

export function DraftNow({ topics }: { topics: Array<{ id: string; title: string }> }) {
  const [state, action, pending] = useActionState(draftNow, initial);
  const [picked, setPicked] = useState(topics[0]?.id ?? "");

  return (
    <Card className="p-5">
      <h2 className="h-tight text-[16px]">Write a draft now</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        The scheduler does this every three days on its own. This is for when you want one
        immediately. It costs 3 AI credits and still lands as a draft for review.
      </p>
      {state.message && <div className="mt-3"><Alert tone="danger">{state.message}</Alert></div>}

      {topics.length === 0 ? (
        <p className="mt-3 text-[13.5px] text-ink-2">Add a topic to the queue below first.</p>
      ) : (
        <form action={action} className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Topic" name="topic_id">
            <select id="topic_id" name="topic_id" className={inputClass} value={picked} onChange={(e) => setPicked(e.target.value)}>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={pending}>{pending ? "Writing…" : "Write the draft"}</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
