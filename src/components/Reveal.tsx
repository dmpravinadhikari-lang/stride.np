"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fades and lifts its children in the first time they scroll into view.
 *
 * A CSS animation cannot do this on its own — it fires on page load, so
 * everything below the fold has finished animating before anyone scrolls to
 * it. An IntersectionObserver waits until the element is actually on screen.
 *
 * It reveals once and then disconnects: content that re-animates every time it
 * passes the viewport is distracting on a phone, where a page is scrolled up
 * and down far more than on a desktop.
 *
 * Anyone who has asked their device to stop animating gets the finished state
 * immediately, with no observer attached at all.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  /** Stagger, in milliseconds, so a row of cards arrives in sequence. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        io.disconnect();
      },
      // Start a little before the element's top edge arrives, so the movement
      // has finished by the time it is properly in the reader's view.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${shown ? "is-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
