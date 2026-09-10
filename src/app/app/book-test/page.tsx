import { requireScope } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/roles";
import {
  bookingsForStudent, bookingsForTenant, CENTRES, EXAMS, examById, FEES_AS_OF,
} from "@/modules/booking/data";
import { updateBooking } from "@/modules/booking/actions";
import { RequestForm } from "./request-form";
import { npr } from "@/lib/terms";
import { Alert, Card, Chip, Empty, ScrollHint, inputClass, type Tone } from "@/components/ui";
import { requireModule } from "@/lib/auth/module-guard";

export const metadata = { title: "Book IELTS / PTE, STRIDE" };

const STATUS: Record<string, { label: string; tone: Tone }> = {
  requested: { label: "Waiting on your consultancy", tone: "gold" },
  confirmed: { label: "Booked", tone: "teal" },
  sat: { label: "Test sat", tone: "grey" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export default async function BookTestPage() {
  // Entitlement check before anything is read or billed.
  await requireModule("test-booking");
  const { user, scope } = await requireScope();
  const staff = isStaff(user.role);
  const mine = bookingsForStudent(scope, user.id);
  const queue = staff ? bookingsForTenant(scope) : [];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="display text-[28px]">Book IELTS or PTE</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          What each test costs, where you can sit it, and a request your consultancy turns into an
          actual booking.
        </p>
      </header>

      <Alert tone="brand" title="How this works, plainly">
        STRIDE is not a test reseller. Nothing here takes payment or holds a seat. You say what you
        want, your consultancy books it with the British Council, IDP or Pearson, and the confirmed
        date lands here.
      </Alert>

      <section>
        <h2 className="h-tight text-[17px]">What each test costs</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {EXAMS.map((e) => (
            <Card key={e.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="h-tight text-[15.5px]">{e.name}</h3>
                <span className="num shrink-0 text-[15px] font-semibold text-ink">{npr(e.feeNpr)}</span>
              </div>
              <p className="mt-1 text-[12.5px] text-muted">{e.board} · results {e.resultsIn.toLowerCase()}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{e.feeNote}</p>
              <a href={e.site} target="_blank" rel="noreferrer"
                className="mt-3 inline-flex min-h-[40px] items-center text-[12.5px] font-semibold text-brand-600 hover:underline">
                Official booking site ↗
              </a>
            </Card>
          ))}
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-muted">
          Fees as published for {FEES_AS_OF}. PTE is priced in dollars so its rupee figure moves.
          Confirm on the official site before paying. This is a planning figure.
        </p>
      </section>

      {!staff && <RequestForm />}

      <section>
        <h2 className="h-tight text-[17px]">Where you can sit them</h2>
        <div className="scroll-soft mt-3 overflow-x-auto rounded-[20px] border border-line bg-panel">
          <table className="w-full min-w-[460px] text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-wash/60 text-left">
                {["City", "IELTS", "PTE", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.11em] text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CENTRES.map((c) => (
                <tr key={c.city} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 font-semibold text-ink">{c.city}</td>
                  <td className="px-4 py-2.5">{c.ielts ? <span className="font-bold text-teal-700">✓</span> : <span className="text-line-2">·</span>}</td>
                  <td className="px-4 py-2.5">{c.pte ? <span className="font-bold text-teal-700">✓</span> : <span className="text-line-2">·</span>}</td>
                  <td className="px-4 py-2.5 text-[12.5px] text-muted">{c.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ScrollHint>Swipe the table sideways to see both tests</ScrollHint>
      </section>

      {!staff && (
        <section>
          <h2 className="h-tight text-[17px]">Your requests</h2>
          {mine.length === 0 ? (
            <div className="mt-3"><Empty icon="🎫" title="Nothing requested yet">
              Sit a practice test first. Booking the real one before you know your band is how
              students pay twice.
            </Empty></div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {mine.map((b) => {
                const s = STATUS[b.status] ?? STATUS.requested;
                return (
                  <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14.5px] font-semibold text-ink">{examById(b.exam)?.name ?? b.exam}</span>
                        <Chip tone={s.tone}>{s.label}</Chip>
                      </div>
                      <div className="mt-0.5 text-[12.5px] text-muted">
                        {b.city}
                        {b.preferred_from && ` · you asked for ${new Date(b.preferred_from).toLocaleDateString()}${b.preferred_to ? ` to ${new Date(b.preferred_to).toLocaleDateString()}` : ""}`}
                      </div>
                      {b.booked_on && (
                        <div className="mt-1 text-[13px] font-semibold text-teal-700">
                          Booked for {new Date(b.booked_on).toLocaleDateString()}
                          {b.centre ? ` at ${b.centre}` : ""}{b.reference ? ` · ref ${b.reference}` : ""}
                        </div>
                      )}
                      {b.staff_note && <p className="mt-1 text-[12.5px] text-ink-2">{b.staff_note}</p>}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {staff && (
        <section>
          <h2 className="h-tight text-[17px]">
            Requests to action <span className="num text-[13px] font-normal text-muted">· {queue.filter((b) => b.status === "requested").length} open</span>
          </h2>
          {queue.length === 0 ? (
            <div className="mt-3"><Empty icon="🎫" title="No requests yet">
              Students request a slot here and it lands in this list.
            </Empty></div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {queue.map((b) => {
                const s = STATUS[b.status] ?? STATUS.requested;
                return (
                  <Card key={b.id} className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[14.5px] font-semibold text-ink">{b.full_name}</span>
                          <Chip tone={s.tone}>{s.label}</Chip>
                        </div>
                        <div className="mt-0.5 text-[12.5px] text-muted">
                          {examById(b.exam)?.name ?? b.exam} · {b.city}
                          {b.preferred_from && ` · wants ${new Date(b.preferred_from).toLocaleDateString()}${b.preferred_to ? `–${new Date(b.preferred_to).toLocaleDateString()}` : ""}`}
                        </div>
                        {b.note && <p className="mt-1 text-[13px] text-ink-2">“{b.note}”</p>}
                      </div>
                    </div>

                    <form action={updateBooking} className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-5">
                      <input type="hidden" name="id" value={b.id} />
                      <input type="date" name="booked_on" defaultValue={b.booked_on?.slice(0, 10) ?? ""} className={inputClass} aria-label="Date booked" />
                      <input name="centre" defaultValue={b.centre ?? ""} placeholder="Centre" className={inputClass} />
                      <input name="reference" defaultValue={b.reference ?? ""} placeholder="Reference" className={inputClass} />
                      <select name="status" defaultValue={b.status} className={inputClass} aria-label="Status">
                        {["requested", "confirmed", "sat", "cancelled"].map((v) => <option key={v} value={v}>{STATUS[v].label}</option>)}
                      </select>
                      <button type="submit" className="rounded-full bg-brand-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-600">
                        Save
                      </button>
                      <div className="sm:col-span-5">
                        <input name="staff_note" defaultValue={b.staff_note ?? ""} placeholder="Note for the student" className={inputClass} />
                      </div>
                    </form>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
