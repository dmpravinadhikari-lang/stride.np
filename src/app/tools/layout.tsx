import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LinkButton } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { currentUser } from "@/lib/auth/current";
import { GoogleAnalytics } from "@/lib/analytics/ga";
import { PageTransition } from "@/components/PageTransition";

/**
 * The public shell. Everything under /tools works with no account, because a
 * tool behind a signup wall is a tool nobody finds.
 */
export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-canvas">
      <GoogleAnalytics />
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex items-center gap-5">
            <Logo />
            <Link href="/tools" className="hidden text-[13.5px] font-semibold text-ink-2 hover:text-brand-600 sm:block">
              Free tools
            </Link>
            <Link href="/blog" className="hidden text-[13.5px] font-semibold text-ink-2 hover:text-brand-600 sm:block">
              Guides
            </Link>
          </div>
          {user
            ? <LinkButton href="/app" size="sm">My dashboard</LinkButton>
            : <div className="flex items-center gap-2">
                <Link href="/login" className="rounded-full px-3 py-2 text-[13.5px] font-semibold text-ink-2 hover:text-brand-600">Login</Link>
                <LinkButton href="/signup" size="sm">For consultancies</LinkButton>
              </div>}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <PageTransition>{children}</PageTransition>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-5xl px-5 py-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-sm">
              <Logo />
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                Free tools for Nepali students, and the platform consultancies run them on.
                No account needed for anything on this page.
              </p>
            </div>
            <nav className="flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Work out the money</span>
                <Link href="/tools/cost" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">True cost calculator</Link>
                <Link href="/tools/loan" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">Education loan EMI</Link>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Work out where</span>
                <Link href="/tools/eligibility" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">Eligibility check</Link>
                <Link href="/tools/universities" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">University finder</Link>
                <Link href="/tools/scholarships" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">Scholarship finder</Link>
                <Link href="/tools/compare" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">Compare destinations</Link>
                <Link href="/tools/checklist" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">Application timeline</Link>
                <Link href="/tools/document-checklist" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">Document checklist</Link>
                <Link href="/blog" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">Guides</Link>
              </div>
            </nav>
          </div>
          <p className="mt-8 text-[12px] text-muted">© {new Date().getFullYear()} {BRAND.name} · Made in Kathmandu</p>
        </div>
      </footer>
    </div>
  );
}
