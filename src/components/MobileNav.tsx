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
  groups, primary, credits, userName, userRole, tenantName, planLabel,
}: {
  groups: NavGroup[];
  primary: NavItem[];
  credits: { remaining: number; allowance: number; scopeLabel: string };
  userName: string; userRole: string; tenantName: string;
  planLabel: string;
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
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-rail px-4 py-2.5 lg:hidden">
        <Logo href="/app" tone="light" />
        <div className="flex items-center gap-2">
          <span className={`num rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
            low ? "bg-gold-100 text-gold-600" : "bg-rail-2 text-rail-ink/80"}`}>
            {credits.remaining} credits
          </span>
          <button
            type="button" onClick={() => setOpen(true)}
            aria-label="Open menu" aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-rail-ink"
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
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <Logo href="/app" tone="light" />
              <button
                type="button" onClick={() => setOpen(false)} aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-rail-ink"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="scroll-soft flex-1 overflow-y-auto px-3 py-4">
              {groups.map((g) => (
                <div key={g.group ?? "main"} className="mb-5">
                  {g.group && (
                    <div className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-rail-ink/45">
                      {g.group}
                    </div>
                  )}
                  {g.items.map((it) => (
                    <Link
                      key={it.href + it.label} href={it.href}
                      className={`flex min-h-[46px] items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium ${
                        active(it.href) ? "bg-rail-3 font-semibold text-white" : "text-rail-ink/80"}`}
                    >
                      <Icon name={it.icon} size={19} className={active(it.href) ? "text-brand-300" : "text-rail-ink/55"} />
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.state === "soon" && (
                        <span className="rounded-full bg-rail-2 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase text-rail-ink/50">Soon</span>
                      )}
                      {it.state === "locked" && <Icon name="lock" size={14} className="text-rail-ink/45" label="Not on your plan" />}
                    </Link>
                  ))}
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 px-5 py-4">
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="font-semibold text-rail-ink/80">AI credits</span>
                <span className="num text-rail-ink/60">{credits.remaining} / {credits.allowance}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rail-2">
                <div
                  className={`h-full rounded-full ${low ? "bg-gold-600" : "bg-brand-300"}`}
                  style={{ width: `${credits.allowance ? Math.min(100, ((credits.allowance - credits.remaining) / credits.allowance) * 100) : 0}%` }}
                />
              </div>
              <p className="mt-2 text-[11.5px] text-rail-ink/55">Resets on the 1st · {credits.scopeLabel}</p>
              <div className="mt-3 border-t border-white/10 pt-3">
                <Link href="/app/profile" className="text-[13px] font-semibold text-white">{userName}</Link>
                <div className="text-[11.5px] text-rail-ink/55">
                  {userRole} · {tenantName} · {planLabel}
                </div>
                <form action={logout} className="mt-2">
                  <button type="submit" className="inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-semibold text-rail-ink/60 hover:text-white">
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
            className={`flex min-h-[58px] flex-col items-center justify-center gap-0.5 px-1 ${
              active(it.href) ? "text-brand-600" : "text-muted"}`}>
            <Icon name={it.icon} size={22} />
            <span className="truncate text-[10.5px] font-semibold">{it.label}</span>
          </Link>
        ))}
        <button type="button" onClick={() => setOpen(true)}
          aria-label="More: open the full menu" aria-expanded={open}
          className="flex min-h-[58px] flex-col items-center justify-center gap-0.5 px-1 text-muted">
          <Icon name="more" size={22} />
          <span className="text-[10.5px] font-semibold">More</span>
        </button>
      </nav>
    </>
  );
}
