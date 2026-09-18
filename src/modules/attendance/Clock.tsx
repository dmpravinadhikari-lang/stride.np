"use client";

import { useActionState, useEffect, useState } from "react";
import { punch } from "@/modules/attendance/actions";
import type { ClockResult } from "@/modules/attendance/data";

/**
 * Clock in and clock out.
 *
 * Deliberately large and deliberately the first thing on the page. It is the
 * one control in the product somebody uses twice a day every day, and a
 * register only works if clocking is easier than forgetting.
 *
 * The location is read here, in the browser, at the moment of the press. It is
 * never read at sign-in.
 */
export function Clock({ open, branchName }: { open: boolean; branchName: string | null }) {
  const [state, action, pending] = useActionState<ClockResult | null, FormData>(punch, null);
  const [fix, setFix] = useState<{ lat: number; lng: number; accuracy: number | null } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  // Asked for as soon as the control is on screen, so the fix has time to
  // settle before anybody presses anything. A cold GPS can take several
  // seconds and nobody wants to stand still waiting for it.
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoError("This browser cannot share a location.");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setGeoError(null);
        setFix({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
      },
      (e) => setGeoError(
        e.code === e.PERMISSION_DENIED
          ? "Location is blocked for this site. Allow it in your browser settings, then reload."
          : "Could not get a location fix. Step near a window and try again.",
      ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const needsReason = state?.needsReason ?? false;

  return (
    <form action={action} className="rounded-xl border border-line bg-panel p-5">
      <input type="hidden" name="direction" value={open ? "out" : "in"} />
      <input type="hidden" name="lat" value={fix?.lat ?? ""} />
      <input type="hidden" name="lng" value={fix?.lng ?? ""} />
      <input type="hidden" name="accuracy" value={fix?.accuracy ?? ""} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {branchName ?? "Your branch"}
          </div>
          <div className="h-tight mt-1 text-[19px] font-bold text-ink">
            {open ? "You are clocked in" : "Not clocked in"}
          </div>
          <div className="mt-1 text-[12.5px] text-muted">
            {geoError
              ? geoError
              : fix
                ? `Location ready, give or take ${Math.round(fix.accuracy ?? 0)} m`
                : "Getting your location"}
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className={`min-h-14 shrink-0 rounded-full px-8 text-[16px] font-bold text-white disabled:opacity-60 ${
            open ? "bg-danger-600" : "bg-brand-500"
          }`}
        >
          {pending ? "One moment" : open ? "Clock out" : "Clock in"}
        </button>
      </div>

      {needsReason && (
        <div className="mt-4 rounded-xl bg-gold-100 p-4">
          <p className="text-[13.5px] font-semibold text-gold-600">{state?.message}</p>
          <p className="mt-1 text-[12.5px] text-gold-600">
            You can still clock in. Say where you are and why, and it goes on the record for your
            manager rather than being refused.
          </p>
          <input
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            placeholder="At the British Council fair with two students"
            className="mt-2.5 w-full min-h-11 rounded-lg border border-line bg-panel px-3 text-[14px]"
          />
        </div>
      )}

      {state && !needsReason && (
        <p className={`mt-3 text-[13.5px] ${state.ok ? "text-teal-700" : "text-danger-600"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
