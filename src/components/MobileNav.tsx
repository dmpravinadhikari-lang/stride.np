"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { logout } from "@/lib/auth/actions";
import { Icon } from "@/components/Icon";
import type { NavGroup, NavItem } from "@/lib/nav";

/**
 * Mobile navigation.
 *
 * Nine out of ten people reach this site on a phone, so the desktop sidebar is
 * the wrong default, not the other way round. A full-width column of eleven
 * links above the content meant scrolling past the entire menu on every page.
 *
 * Instead: a slim bar at the top, the four things people actually use at the
 * bottom under the thumb, and everything else in a drawer. It is also the shape
 * a native app takes, so the pattern carries over rather than being relearnt.
 */
export function MobileNav({
  groups, primary, credits, userName, userRole, tenantName, planLabel, isStaff = false,
}: {
  groups: NavGroup[];
  primary: NavItem[];
  credits: { remaining: number; allowance: number; scopeLabel: string };
  userName: string; userRole: string; tenantName: string;
  planLabel: string; isStaff?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // A route change should always close the drawer, however it was triggered.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Stop the page scrolling behind an open drawer.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const active = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));
  const low = credits.allowance > 0 && credits.remaining < credits.allowance * 0.2;

  return (
    <>
      {/* top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-panel px-4 py-2.5 lg:hidden">
        <Logo href="/app" />
        <div className="flex items-center gap-2">
          <span className={`num rounded-full px-2.5 py-1 text-[11.5px] font-medium ${
            low ? "bg-gold-100 text-gold-600" : "bg-wash text-ink-2"}`}>
            {credits.remaining} credits
          </span>
          <button
            type="button" onClick={() => setOpen(true)}
            aria-label="Open menu" aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line-2 text-ink-2"
          >
            <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden>
              <path d="M1 1h16M1 7h16M1 13h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {/* drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button" aria-label="Close menu" onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] motion-safe:animate-[fade_.2s_ease-out]"
          />
          <nav className="absolute right-0 top-0 flex h-full w-[86%] max-w-[330px] flex-col bg-rail text-rail-ink shadow-2xl motion-safe:animate-[slidein_.26s_cubic-bezier(.22,1,.36,1)]">
            <div className="flex items-center justify-between border-b border-white/12 px-5 py-3.5">
              <Logo href="/app" tone="dark" size={24} />
              <button
                type="button" onClick={() => setOpen(false)} aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {isStaff && (
              <form action="/app/pipeline" className="relative px-4 pt-4">
                <label htmlFor="drawer-search" className="sr-only">Search students</label>
                <Icon name="search" size={16} className="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  id="drawer-search" name="q" type="search" placeholder="Search a student"
                  className="min-h-[44px] w-full rounded-full border border-line-2 bg-panel pl-9 pr-3 text-[14px] text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none"
                />
              </form>
            )}

            <div className="scroll-soft flex-1 overflow-y-auto px-3 py-4">
              {groups.map((g) => (
                <div key={g.group ?? "main"} className="mb-5">
                  {g.group && (
                    <div className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-rail-ink">
                      {g.group}
                    </div>
                  )}
                  {g.items.map((it) => (
                    <Link
                      key={it.href + it.label} href={it.href}
                      className={`flex min-h-[48px] items-center gap-3 rounded-full px-4 text-[14px] font-medium ${
                        active(it.href) ? "bg-rail-3 font-semibold text-ink" : "text-rail-ink hover:bg-rail-2 hover:text-white"}`}
                    >
                      <Icon name={it.icon} size={19} className={active(it.href) ? "text-ink" : "text-rail-ink"} />
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.badge ? (
                        <span className="rounded-full bg-accent-500 px-1.5 py-0.5 text-[10.5px] font-bold text-ink">{it.badge}</span>
                      ) : null}
                      {it.state === "soon" && (
                        <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase text-rail-ink">Soon</span>
                      )}
                      {it.state === "locked" && <Icon name="lock" size={14} className="text-rail-ink" label="Not on your plan" />}
                    </Link>
                  ))}
                </div>
              ))}
            </div>

            <div className="border-t border-white/12 px-5 py-4">
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="font-medium text-white">AI credits</span>
                <span className="mono text-rail-ink">{credits.remaining} / {credits.allowance}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className={`h-full rounded-full ${low ? "bg-accent-500" : "bg-brand-500"}`}
                  style={{ width: `${credits.allowance ? Math.min(100, ((credits.allowance - credits.remaining) / credits.allowance) * 100) : 0}%` }}
                />
              </div>
              <p className="mt-2 text-[11.5px] text-rail-ink">Resets on the 1st · {credits.scopeLabel}</p>
              <div className="mt-3 border-t border-white/12 pt-3">
                <Link href="/app/profile" className="text-[13px] font-semibold text-white">{userName}</Link>
                <div className="text-[11.5px] text-rail-ink">
                  {userRole} · {tenantName} · {planLabel}
                </div>
                <form action={logout} className="mt-2">
                  <button type="submit" className="inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-medium text-rail-ink hover:text-white">
                    <Icon name="logout" size={16} /> Log out
                  </button>
                </form>
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* bottom tabs, the four things people open every day, under the thumb */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0,1fr))` }}
      >
        {primary.map((it) => (
          <Link key={it.href} href={it.href} aria-current={active(it.href) ? "page" : undefined}
            className={`flex min-h-[58px] flex-col items-center justify-center gap-1 px-1 ${
              active(it.href) ? "font-semibold text-brand-600" : "text-ink-2"}`}>
            <span className={`relative grid h-7 w-16 place-items-center rounded-full transition-colors ${active(it.href) ? "bg-rail-3" : ""}`}>
              <Icon name={it.icon} size={21} />
              {it.badge ? (
                <span className="absolute -right-2 -top-1 min-w-[16px] rounded-full bg-accent-500 px-1 text-[10px] font-bold leading-4 text-ink">
                  {it.badge > 9 ? "9+" : it.badge}
                </span>
              ) : null}
            </span>
            <span className="truncate text-[11.5px] font-medium">{it.label}</span>
          </Link>
        ))}
        <button type="button" onClick={() => setOpen(true)}
          aria-label="More: open the full menu" aria-expanded={open}
          className="flex min-h-[58px] flex-col items-center justify-center gap-1 px-1 text-ink-2">
          <Icon name="more" size={22} />
          <span className="text-[11.5px] font-medium">More</span>
        </button>
      </nav>
    </>
  );
}
