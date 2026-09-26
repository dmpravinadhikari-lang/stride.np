"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";

/*
 * The active item is a Yak Orange pill, which the brand book sets, with Night
 * Navy on it, which the brand book forbids.
 *
 * That contradiction is in the book itself and it cannot be honoured both
 * ways. White on Yak Orange measures 2.61:1 at this size, which the same book
 * rules out by allowing white on orange only at 24px and up, and a nav label
 * is 13.5px. Darkening the orange until white works takes it to about
 * #BC5700, which stops being Yak Orange and, worse, falls to 3.8:1 against
 * the navy rail, so the pill starts disappearing into the surface whose whole
 * job is to make it stand out.
 *
 * Ink on Yak Orange measures 6.79:1. So the exact brand colour is kept, the
 * pill is unmistakable, the label is readable, and the departure is written
 * down here and in docs/brand/BRAND.md rather than discovered later.
 */
export function NavLink({
  href, icon, label, state, exact = false, badge, hint,
}: {
  href: string; icon: IconName; label: string;
  state: "open" | "locked" | "soon"; exact?: boolean; badge?: number; hint?: string;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href) && href !== "/app";

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-[40px] items-center gap-3 rounded-[20px] px-3.5 py-1.5 text-[13.5px] font-medium transition-colors ${
        active ? "bg-rail-3 font-semibold text-ink" : "text-rail-ink hover:bg-rail-2 hover:text-white"
      }`}
    >
      <Icon
        name={icon} size={17}
        className={active ? "text-ink" : state === "open" ? "text-rail-ink" : "text-rail-ink/50"}
      />
      <span className="min-w-0 flex-1">
        <span className={`block truncate ${state === "open" ? "" : "text-rail-ink/60"}`}>{label}</span>
        {/* The line that saves the explaining. Only the daily rows carry one:
            a hint under every link would be a paragraph, not a menu. */}
        {hint && (
          <span className={`block truncate text-[11px] leading-tight ${active ? "text-ink/75" : "text-rail-ink/70"}`}>
            {hint}
          </span>
        )}
      </span>
      {badge ? (
        <span className="rounded-full bg-accent-500 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-ink">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
      {state === "soon" && (
        <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">Soon</span>
      )}
      {state === "locked" && <Icon name="lock" size={14} className="text-muted" label="Not on your plan" />}
    </Link>
  );
}
