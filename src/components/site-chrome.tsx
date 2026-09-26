import type { ReactNode } from "react";
import Link from "next/link";
import { Logo, Ridge } from "@/components/Logo";
import { BRAND } from "@/lib/brand";

/**
 * The header and footer every public page wears.
 *
 * They were drawn three times - once on the homepage, once on the guides
 * index, once on a guide - and had drifted three different ways: one header
 * on white rather than Paper, two button radii, two oranges, and no footer at
 * all on the guides. A reader who arrives on a guide from a search result
 * should be on the same website as a reader who arrives at the homepage.
 *
 * The header takes `signedIn` rather than reading the session itself, because
 * the guides are generated at build time and a page that asks who is reading
 * it cannot be.
 */

const NAV = [
  ["Product", "/#product"],
  ["Modules", "/#modules"],
  ["Pricing", "/#pricing"],
  ["Guides", "/blog"],
];

/** Yak Orange with Ink on it: 6.79:1, where white on the same orange is 2.61. */
const ORANGE =
  "inline-flex items-center justify-center rounded-[10px] bg-brand-500 px-[18px] text-[15px] font-semibold text-ink transition-colors hover:bg-brand-400";

export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-wash bg-canvas/85 backdrop-blur-[14px]">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-6 py-4">
        <Logo href="/" size={28} />
        <nav className="hidden items-center gap-7 text-[15px] font-medium text-muted md:flex">
          {NAV.map(([label, href]) => (
            <Link key={href} href={href} className="transition-colors hover:text-ink">{label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {signedIn ? (
            <Link href="/app" className={`${ORANGE} min-h-[44px]`}>Open my dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="text-[15px] font-medium text-muted hover:text-ink">Log in</Link>
              <Link href="/signup" className={`${ORANGE} min-h-[44px]`}>Start free</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * The Summit Yellow band that closes a page, with Ink on it - the one pairing
 * the palette calls good at any size - and the Navy button beside it.
 */
export function CtaBand({
  children = "Let the Yak carry the office. You do the counselling.",
  action = "Start free in ten minutes",
}: { children?: ReactNode; action?: string }) {
  return (
    <section className="bg-accent-500">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-8 px-6 py-[72px]">
        <h2 className="display max-w-[620px] text-[clamp(28px,3vw,40px)] leading-[1.1] tracking-[-0.03em] text-ink">
          {children}
        </h2>
        <Link
          href="/signup"
          className="inline-flex min-h-[50px] shrink-0 items-center justify-center rounded-[10px] bg-ink px-[22px] text-[16px] font-semibold text-white transition-colors hover:bg-ink-2"
        >
          {action}
        </Link>
      </div>
    </section>
  );
}

const COLUMNS = [
  { head: "Product", links: [["Student leads", "/#modules"], ["Attendance", "/#product"], ["Mock tests and AI interview", "/#students"], ["SOP Studio", "/tools"], ["HR and payroll", "/#modules"]] },
  { head: "Company", links: [["Pricing", "/#pricing"], ["Security", "/#security"], ["Log in", "/login"], ["Start free", "/signup"]] },
  { head: "Guides", links: [["All guides", "/blog"], ["Free student tools", "/tools"], ["True cost calculator", "/tools/cost"], ["University finder", "/tools/universities"]] },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-ink text-white">
      {/* The ridge flipped along the top, at the 18% the guidelines give it. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0">
        <Ridge flip height={90} opacity={0.18} />
      </div>
      <div className="relative mx-auto max-w-[1200px] px-6 pb-12 pt-24">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3.5">
            <Logo tone="dark" size={26} />
            <p className="max-w-[260px] text-[14px] leading-[1.5] text-[#B9B8CC]">
              The AI-powered operating system for education consultancies. Built in Nepal.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.head} className="flex flex-col gap-2.5">
              <span className="text-[15px] font-semibold">{col.head}</span>
              {col.links.map(([l, h]) => (
                <Link key={`${col.head}-${l}`} href={h} className="text-[14px] text-[#B9B8CC] transition-colors hover:text-white">
                  {l}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-5 text-[13px] text-[#8A899E]">
          <span>© {new Date().getFullYear()} {BRAND.name} · {BRAND.domain}</span>
          <span className="flex gap-2">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <span aria-hidden>·</span>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <span aria-hidden>·</span>
            <Link href="/#security" className="hover:text-white">Security</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
