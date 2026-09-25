"use client";

import { useActionState, useEffect, useState } from "react";
import { kioskPunch, type PunchState } from "@/modules/kiosk/actions";
import { Icon } from "@/components/Icon";

type Person = { id: string; full_name: string; has_pin: number; open_shift: number };

/**
 * The clock on the front desk.
 *
 * Built for somebody standing up, in a coat, with a queue behind them: pick
 * your name, four digits, done. Everything is finger sized and there is
 * nothing else on the screen to press.
 *
 * It resets to the list of names a few seconds after each punch, because the
 * next person should not find the last person's name selected.
 */
export function KioskClock({ people, office }: { people: Person[]; office: string }) {
  const [state, punch, pending] = useActionState<PunchState, FormData>(kioskPunch, null);
  const [picked, setPicked] = useState<Person | null>(null);
  const [pin, setPin] = useState("");
  const [fix, setFix] = useState<{ lat: number; lng: number; accuracy: number | null } | null>(null);
  const [note, setNote] = useState("");

  // The location is read while somebody is choosing their name, so the fix
  // has settled by the time they press the button.
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setFix({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Back to the list, so the desk is never left showing one person's screen.
  useEffect(() => {
    if (!state) return;
    const t = setTimeout(() => { setPicked(null); setPin(""); setNote(""); }, state.ok ? 4000 : 8000);
    return () => clearTimeout(t);
  }, [state]);

  if (state?.ok) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-teal-100 text-teal-700">
          <Icon name="check" size={40} />
        </span>
        <p className="display mt-6 text-[32px]">{state.message}</p>
        <button
          type="button" onClick={() => { setPicked(null); setPin(""); setNote(""); }}
          className="mt-10 min-h-[56px] rounded-full border border-line-2 px-8 text-[16px] font-medium text-ink-2"
        >
          Next person
        </button>
      </div>
    );
  }

  if (!picked) {
    return (
      <div className="px-6 py-8">
        <h1 className="display text-[28px]">Who is clocking?</h1>
        <p className="mt-1.5 text-[15px] text-muted">{office}</p>
        {state && !state.ok && (
          <p className="mt-4 rounded-xl border border-danger-600/30 bg-danger-100 px-4 py-3 text-[14.5px] text-danger-600" role="alert">
            {state.message}
          </p>
        )}
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((p) => (
            <button
              key={p.id} type="button" onClick={() => setPicked(p)}
              className="flex min-h-[86px] items-center gap-4 rounded-2xl border border-line bg-panel px-5 text-left transition-colors hover:border-brand-400"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-50 text-[16px] font-medium text-brand-700">
                {p.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[17px] font-medium text-ink">{p.full_name}</span>
                <span className={`block text-[13.5px] ${p.open_shift ? "text-teal-700" : "text-muted"}`}>
                  {p.open_shift ? "Clocked in" : p.has_pin ? "Not clocked in" : "No PIN set yet"}
                </span>
              </span>
            </button>
          ))}
        </div>
        {people.length === 0 && (
          <p className="mt-6 text-[15px] text-muted">Nobody is attached to this office yet.</p>
        )}
      </div>
    );
  }

  const out = picked.open_shift > 0;

  return (
    <form action={punch} className="mx-auto max-w-md px-6 py-8">
      <input type="hidden" name="user_id" value={picked.id} />
      <input type="hidden" name="pin" value={pin} />
      <input type="hidden" name="lat" value={fix?.lat ?? ""} />
      <input type="hidden" name="lng" value={fix?.lng ?? ""} />
      <input type="hidden" name="accuracy" value={fix?.accuracy ?? ""} />
      <input type="hidden" name="note" value={note} />

      <button
        type="button" onClick={() => { setPicked(null); setPin(""); }}
        className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-medium text-muted"
      >
        <Icon name="arrow" size={16} className="rotate-180" /> Not me
      </button>

      <h1 className="display mt-3 text-[26px]">{picked.full_name}</h1>
      <p className="mt-1 text-[15px] text-muted">
        {out ? "Clocking out. Enter your PIN." : "Clocking in. Enter your PIN."}
      </p>

      {state && !state.ok && (
        <p className="mt-4 rounded-xl border border-danger-600/30 bg-danger-100 px-4 py-3 text-[14.5px] text-danger-600" role="alert">
          {state.message}
        </p>
      )}

      <div className="mt-6 flex justify-center gap-3" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full ${i < pin.length ? "bg-brand-500" : i < 4 ? "bg-line-2" : "bg-line"}`}
          />
        ))}
      </div>
      <label htmlFor="pin-value" className="sr-only">PIN</label>
      <input id="pin-value" value={pin} readOnly className="sr-only" />

      <div className="mt-7 grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d} type="button" onClick={() => setPin((p) => (p.length < 6 ? p + d : p))}
            className="min-h-[72px] rounded-2xl border border-line bg-panel text-[24px] font-medium text-ink transition-colors active:bg-wash"
          >
            {d}
          </button>
        ))}
        <button
          type="button" onClick={() => setPin("")}
          className="min-h-[72px] rounded-2xl border border-line text-[15px] font-medium text-muted"
        >
          Clear
        </button>
        <button
          type="button" onClick={() => setPin((p) => (p.length < 6 ? p + "0" : p))}
          className="min-h-[72px] rounded-2xl border border-line bg-panel text-[24px] font-medium text-ink active:bg-wash"
        >
          0
        </button>
        <button
          type="button" onClick={() => setPin((p) => p.slice(0, -1))}
          className="min-h-[72px] rounded-2xl border border-line text-[15px] font-medium text-muted"
        >
          Back
        </button>
      </div>

      {out && (
        <div className="mt-7">
          <label htmlFor="kiosk-note" className="text-[14px] font-medium text-ink">
            What did you get done today?
          </label>
          <textarea
            id="kiosk-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Sat with two walk-ins, chased three bank letters"
            className="mt-2 w-full rounded-xl border border-line-2 bg-panel px-4 py-3 text-[15px] text-ink focus:border-brand-500 focus:outline-none"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={pending || pin.length < 4 || (out && note.trim().length < 3)}
        className={`mt-7 min-h-[64px] w-full rounded-full text-[18px] font-medium text-white disabled:opacity-50 ${
          out ? "bg-danger-600" : "bg-brand-500"
        }`}
      >
        {pending ? "One moment" : out ? "Clock out" : "Clock in"}
      </button>
    </form>
  );
}
