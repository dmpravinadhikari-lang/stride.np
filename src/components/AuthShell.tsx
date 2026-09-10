import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { BRAND } from "@/lib/brand";

export function AuthShell({
  title, sub, children, footer, branch,
}: {
  title: string; sub: string; children: ReactNode; footer: ReactNode;
  /** The consultancy whose address this page was opened at, if any. */
  branch?: { name: string; accent: string } | null;
}) {
  return (
    <main className="wash min-h-screen">
      <div className="mx-auto max-w-md px-5 py-10">
        <Logo />

        {/* A student was told to sign in at their consultancy's own address.
            Saying whose door this is reassures them they are in the right
            place, and quietly tells anyone who mistyped a subdomain that they
            are not. */}
        {branch && (
          <div
            className="mt-6 flex items-center gap-2.5 rounded-2xl border border-line bg-panel px-4 py-3"
            style={{ borderLeftColor: branch.accent, borderLeftWidth: 4 }}
          >
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold text-white"
              style={{ background: branch.accent }}
            >
              {branch.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                Signing in to
              </div>
              <div className="truncate text-[14px] font-semibold text-ink">{branch.name}</div>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-line bg-panel p-6 sm:p-8">
          <h1 className="display text-[28px]">{title}</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{sub}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-5 text-center text-[13.5px] text-muted">{footer}</p>
        <p className="mt-8 text-center text-[12px] text-muted">
          <Link href="/" className="inline-flex min-h-11 items-center hover:text-brand-600 sm:min-h-0">← Back to {BRAND.domain}</Link>
        </p>
      </div>
    </main>
  );
}
