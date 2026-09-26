"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { NavLink } from "@/components/NavLink";
import type { NavGroup } from "@/lib/nav";

/**
 * A group of links that is closed until it is wanted.
 *
 * The rail holds five links and three of these. Closed, a group is one row
 * that says what is inside it; open, it is the list it always was. The group
 * holding the current page starts open, so arriving anywhere by link, by
 * typing an address or by the back button leaves the rail agreeing with the
 * screen rather than hiding where you are.
 *
 * It is a button and not a link: pressing a heading must never navigate, or
 * half the office ends up on a page they did not ask for while looking for
 * one they did.
 */
export function NavSection({ group }: { group: NavGroup }) {
  const pathname = usePathname();
  const holdsCurrent = group.items.some(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  const [open, setOpen] = useState(holdsCurrent);
  const shown = open || holdsCurrent;

  /*
   * It remembers.
   *
   * A group closing itself on every page load would make somebody who lives in
   * Documents open the same fold forty times a day, which is worse than the
   * long list this replaced. The choice is kept in the browser, per group, and
   * read after the first paint so the server and the client still agree on
   * what to draw.
   */
  const key = `officeyak.nav.${group.group ?? ""}`;
  useEffect(() => {
    try {
      if (window.localStorage.getItem(key) === "open") setOpen(true);
    } catch {
      /* A browser with storage switched off still gets a working menu. */
    }
  }, [key]);

  const toggle = () => {
    const next = !shown;
    setOpen(next);
    try {
      window.localStorage.setItem(key, next ? "open" : "shut");
    } catch {
      /* Nothing to remember it with, which changes nothing on this visit. */
    }
  };
  const waiting = group.items.reduce((n, i) => n + (i.badge ?? 0), 0);

  const id = `nav-${(group.group ?? "group").toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="mt-4 flex flex-col gap-0.5">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={shown}
        aria-controls={id}
        className="group flex min-h-[40px] items-center gap-2 rounded-[10px] px-3.5 py-1 text-left transition-colors hover:bg-rail-2"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11.5px] font-semibold uppercase tracking-[0.07em] text-rail-ink">
            {group.group}
          </span>
          {group.hint && !shown && (
            <span className="block truncate text-[11px] leading-tight text-rail-ink/60">{group.hint}</span>
          )}
        </span>
        {!shown && waiting > 0 && (
          <span className="rounded-full bg-accent-500 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-ink">
            {waiting > 99 ? "99+" : waiting}
          </span>
        )}
        <Icon
          name="chevron" size={15}
          className={`text-rail-ink/70 transition-transform ${shown ? "rotate-180" : ""}`}
        />
      </button>
      {shown && (
        <div id={id} className="flex flex-col gap-0.5">
          {group.items.map((it) => (
            <NavLink key={it.href + it.label} {...it} />
          ))}
        </div>
      )}
    </div>
  );
}
