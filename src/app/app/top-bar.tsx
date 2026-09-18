"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";

/**
 * The bar across the top of every console page.
 *
 * It holds the two things somebody reaches for without being told: a search
 * that finds a student by name, email or phone, and the buttons that make the
 * two records this office creates all day. Both are in the same place on
 * every screen, so neither has to be looked for twice.
 */
export function TopBar({ office, seesAll }: { office: string | null; seesAll: boolean }) {
  const box = useRef<HTMLInputElement>(null);

  // "/" jumps to the search, the way it does in every tool people already
  // use. It is never stolen from somebody who is typing into a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      e.preventDefault();
      box.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="sticky top-0 z-30 hidden border-b border-line bg-canvas/90 backdrop-blur lg:block">
      <div className="mx-auto flex max-w-[1160px] items-center gap-3 px-6 py-2.5">
        <form action="/app/pipeline" className="relative min-w-0 flex-1 md:max-w-sm">
          <label htmlFor="global-search" className="sr-only">Search students</label>
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            ref={box}
            id="global-search" name="q" type="search"
            placeholder="Search a student by name, email or phone"
            className="min-h-[38px] w-full rounded-full border border-line-2 bg-panel pl-9 pr-12 text-[13.5px] text-ink placeholder:text-muted/80 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line-2 bg-wash px-1.5 py-0.5 text-[11px] font-semibold text-muted xl:block">
            /
          </kbd>
        </form>

        <span className="hidden items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-[12.5px] text-ink-2 xl:inline-flex">
          <Icon name="pin" size={14} className="text-brand-500" />
          {office ?? "No office"}
          <span className="text-muted">{seesAll ? "· all offices" : "· this office"}</span>
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/app/tasks#add"
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[10px] border border-line-2 bg-panel px-3.5 text-[13px] font-semibold text-ink hover:border-brand-400 hover:text-brand-600"
          >
            <Icon name="plus" size={15} /> Task
          </Link>
          <Link
            href="/app/pipeline?add=1#add-student"
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[10px] bg-brand-500 px-3.5 text-[13px] font-semibold text-white hover:bg-brand-600"
          >
            <Icon name="plus" size={15} /> Student
          </Link>
        </div>
      </div>
    </div>
  );
}
