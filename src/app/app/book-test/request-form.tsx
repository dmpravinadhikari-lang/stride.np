"use client";

import { useActionState, useMemo, useState } from "react";
import { requestBooking, type BookingState } from "@/modules/booking/actions";
import { citiesFor, EXAMS } from "@/modules/booking/exams";
import { Alert, Button, Card, Field, inputClass } from "@/components/ui";

const initial: BookingState = { ok: true };

export function RequestForm() {
  const [state, action, pending] = useActionState(requestBooking, initial);
  const [exam, setExam] = useState(EXAMS[0].id);
  const cities = useMemo(() => citiesFor(exam), [exam]);

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="h-tight text-[16px]">Ask your consultancy to book a slot</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        Tell them what you want and roughly when. They book it, and the confirmed date appears below.
      </p>
      {state.message && <div className="mt-3"><Alert tone={state.ok ? "teal" : "danger"}>{state.message}</Alert></div>}

      <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Which test" name="exam">
          <select id="exam" name="exam" className={inputClass} value={exam} onChange={(e) => setExam(e.target.value)}>
            {EXAMS.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </Field>
        <Field label="Where" name="city" hint="Only cities that actually run this test are listed.">
          <select id="city" name="city" className={inputClass}>
            {cities.map((c) => <option key={c.city} value={c.city}>{c.city}</option>)}
          </select>
        </Field>
        <Field label="Earliest date that suits" name="preferred_from">
          <input id="preferred_from" name="preferred_from" type="date" className={inputClass} />
        </Field>
        <Field label="Latest date that suits" name="preferred_to" hint="A range gets you a slot faster than a single date.">
          <input id="preferred_to" name="preferred_to" type="date" className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Anything they should know" name="note">
            <input id="note" name="note" className={inputClass}
              placeholder="Cannot do Saturdays; need the result before the November intake deadline" />
          </Field>
        </div>
        <div><Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send the request"}</Button></div>
      </form>
    </Card>
  );
}
