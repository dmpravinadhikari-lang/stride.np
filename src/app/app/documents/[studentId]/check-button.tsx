"use client";

import { useActionState } from "react";
import { runCheck, type DocState } from "@/modules/documents/actions";
import { Alert, Button, Card } from "@/components/ui";

const initial: DocState = { ok: true };

export function CheckButton({ studentId, hasDocs }: { studentId: string; hasDocs: boolean }) {
  const [state, action, pending] = useActionState(runCheck, initial);

  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="min-w-[240px] flex-1">
        <h2 className="h-tight text-[16px]">Check this file</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          Compares what has been uploaded against what this destination wants at this stage, and
          against what the profile claims. Finds the gap before a deadline does.
        </p>
        {state.message && <div className="mt-3"><Alert tone={state.ok ? "teal" : "danger"}>{state.message}</Alert></div>}
      </div>
      <form action={action}>
        <input type="hidden" name="student_id" value={studentId} />
        <Button type="submit" disabled={pending}>
          {pending ? "Checking…" : hasDocs ? "Run the check (2 credits)" : "Check what's needed (2 credits)"}
        </Button>
      </form>
    </Card>
  );
}
