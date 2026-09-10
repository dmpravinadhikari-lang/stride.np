"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts up when the number scrolls into view, once.
 *
 * Honours prefers-reduced-motion by simply showing the final value, an
 * animation nobody asked for should never be the reason a page is unusable.
 *
 * Two details that are easy to get wrong, and did bite here:
 *
 *  - The frame loop is cancelled on cleanup. Without that, React's
 *    development double-invoke leaves an orphaned loop running against a
 *    component that has been torn down, and the counter freezes wherever that
 *    loop happened to be, around 7% of the way, which reads as a wrong
 *    number rather than as a broken animation.
 *
 *  - Re-entry is prevented by disconnecting the observer, not by a ref that
 *    survives a remount. A ref that outlives the effect blocks the second,
 *    real run from ever starting.
 */
export function CountUp({
  value, suffix = "", durationMs = 1100,
}: { value: number; suffix?: string; durationMs?: number }) {
  const [shown, setShown] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      setShown(value);
      return;
    }

    let frame = 0;

    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      // One shot: stop watching before animating, so nothing can retrigger it.
      observer.disconnect();

      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / durationMs);
        // Ease out, so it decelerates into the final number rather than stopping dead.
        setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.4 });

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [value, durationMs]);

  // Grouped, because "29710" is a string of digits and "29,710" is a sum of
  // money, and these are amounts a family has to actually find.
  return (
    <span ref={ref} className="num tabular-nums">
      {shown.toLocaleString("en-GB")}{suffix}
    </span>
  );
}
