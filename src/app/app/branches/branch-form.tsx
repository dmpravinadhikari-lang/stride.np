"use client";

import { useActionState, useState } from "react";
import { saveBranch, type BranchState } from "@/modules/attendance/branch-actions";
import { Alert, Button, Field, inputClass } from "@/components/ui";
import { Icon } from "@/components/Icon";

type Defaults = {
  id?: string; name?: string; code?: string | null; city?: string | null; address?: string | null;
  phone?: string | null; email?: string | null; lat?: number | null; lng?: number | null;
  radius_m?: number | null; day_starts?: string | null; day_ends?: string | null;
};

const RADII = [
  { m: 80, label: "Small office" },
  { m: 120, label: "Normal" },
  { m: 200, label: "Shared building" },
  { m: 300, label: "Large campus" },
];

/**
 * One office's settings.
 *
 * The location is the part people get stuck on, so the easy way comes first:
 * stand in the office and press "Use my current location". Typing coordinates
 * copied from a map still works for anyone setting up a branch from elsewhere.
 */
export function BranchForm({ b, defaultRadius }: { b: Defaults; defaultRadius: number }) {
  const key = b.id ?? "new";
  const [state, action, pending] = useActionState<BranchState | null, FormData>(saveBranch, null);
  const current = b.radius_m ?? defaultRadius;
  const radii = RADII.some((r) => r.m === current) ? RADII : [...RADII, { m: current, label: "Current" }].sort((x, y) => x.m - y.m);
  const [lat, setLat] = useState(b.lat != null ? String(b.lat) : "");
  const [lng, setLng] = useState(b.lng != null ? String(b.lng) : "");
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const locate = () => {
    if (!("geolocation" in navigator)) { setNote("This browser cannot share a location. Type it in instead."); return; }
    setLocating(true);
    setNote(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(6));
        setLng(p.coords.longitude.toFixed(6));
        setLocating(false);
        setNote(`Found, accurate to about ${Math.round(p.coords.accuracy)} m. Press Save to keep it.`);
      },
      (e) => {
        setLocating(false);
        setNote(e.code === e.PERMISSION_DENIED
          ? "Location is blocked. Allow it in your browser settings, or type the numbers in."
          : "Could not get a location. Step near a window and try again.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <form action={action} className="flex flex-col gap-5">
      {b.id && <input type="hidden" name="id" value={b.id} />}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Office name" name={`name-${key}`}>
          <input id={`name-${key}`} name="name" required defaultValue={b.name ?? ""} className={inputClass} placeholder="Pokhara" />
        </Field>
        <Field label="Short code" name={`code-${key}`} hint="Used on payslips, e.g. PKR.">
          <input id={`code-${key}`} name="code" defaultValue={b.code ?? ""} className={inputClass} placeholder="PKR" />
        </Field>
        <Field label="City" name={`city-${key}`}>
          <input id={`city-${key}`} name="city" defaultValue={b.city ?? ""} className={inputClass} placeholder="Pokhara" />
        </Field>
        <div className="sm:col-span-3">
          <Field label="Street address" name={`address-${key}`}>
            <input id={`address-${key}`} name="address" defaultValue={b.address ?? ""} className={inputClass} placeholder="Lakeside-6" />
          </Field>
        </div>
        <Field label="Phone" name={`phone-${key}`}>
          <input id={`phone-${key}`} name="phone" defaultValue={b.phone ?? ""} className={inputClass} placeholder="061-xxxxxx" />
        </Field>
        <Field label="Email" name={`email-${key}`}>
          <input id={`email-${key}`} name="email" type="email" defaultValue={b.email ?? ""} className={inputClass} placeholder="pokhara@yourconsultancy.com" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Opens" name={`opens-${key}`}>
            <input id={`opens-${key}`} name="day_starts" type="time" defaultValue={b.day_starts ?? "10:00"} className={inputClass} />
          </Field>
          <Field label="Closes" name={`closes-${key}`}>
            <input id={`closes-${key}`} name="day_ends" type="time" defaultValue={b.day_ends ?? "18:00"} className={inputClass} />
          </Field>
        </div>
      </div>

      <fieldset className="rounded-2xl border border-line bg-wash/40 p-4">
        <legend className="px-1 text-[14px] font-semibold text-ink">Where is this office?</legend>
        <p className="text-[13px] text-muted">Staff can clock in only when they are near this spot.</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={locate} disabled={locating}>
            <Icon name="pin" size={16} /> {locating ? "Finding you…" : "Use my current location"}
          </Button>
          {lat && lng && (
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer"
              className="inline-flex min-h-[40px] items-center gap-1 px-2 text-[13px] font-semibold text-brand-600 hover:underline"
            >
              Check it on Google Maps <Icon name="arrow" size={14} />
            </a>
          )}
        </div>
        {note && <p className="mt-2 text-[13px] text-ink-2" role="status">{note}</p>}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Latitude" name={`lat-${key}`}>
            <input id={`lat-${key}`} name="lat" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} className={inputClass} placeholder="28.2096" />
          </Field>
          <Field label="Longitude" name={`lng-${key}`}>
            <input id={`lng-${key}`} name="lng" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} className={inputClass} placeholder="83.9856" />
          </Field>
        </div>

        <div className="mt-4">
          <div className="text-[13px] font-semibold text-ink">How far from that spot counts as "in the office"?</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {radii.map((r) => (
              <label key={r.m} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line-2 bg-panel px-3.5 text-[13px] text-ink-2 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:font-semibold has-[:checked]:text-brand-700 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500">
                <input
                  type="radio" name="radius_m" value={r.m} className="sr-only"
                  defaultChecked={current === r.m}
                />
                {r.label} <span className="num text-muted">{r.m} m</span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        {state?.message && (
          <div role="status"><Alert tone={state.ok ? "teal" : "danger"}>{state.message}</Alert></div>
        )}
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : b.id ? `Save ${b.name}` : "Add office"}
          </Button>
        </div>
      </div>
    </form>
  );
}
