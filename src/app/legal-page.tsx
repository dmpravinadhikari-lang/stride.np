import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { BRAND } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";

/**
 * The frame both legal pages sit in.
 *
 * Written to be read rather than to be survived: one column at a comfortable
 * measure, real headings a person can link to, and the contents listed beside
 * it so somebody looking for the one paragraph about deleting their data can
 * find it in a press. The prose itself is plain, because a policy nobody
 * understands is a policy nobody agreed to.
 */

export type Section = { id: string; title: string; body: ReactNode };

export function LegalPage({
  title, intro, sections, summary,
}: {
  title: string;
  /** One paragraph under the heading, in the same voice as the rest of the site. */
  intro: string;
  /** The short version, for anybody who will not read the long one. */
  summary: string[];
  sections: Section[];
}) {
  return (
    <main className="bg-canvas">
      {/* -------------------------------------------------------------- head */}
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <Logo href="/" />
          <Link
            href="/"
            className="inline-flex min-h-[40px] items-center gap-1.5 text-[13.5px] font-semibold text-ink-2 hover:text-brand-600"
          >
            <Icon name="arrow" size={15} className="rotate-180" /> {BRAND.domain}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-12">
        <div className="max-w-2xl">
          <h1 className="display text-[34px] leading-tight">{title}</h1>
          <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2">{intro}</p>
          <p className="mt-3 text-[13px] text-muted">
            In force from {LEGAL.updated}. {LEGAL.entity}, {LEGAL.place}.
          </p>
        </div>

        {/* The short version, which is the only part most people will read. */}
        <section className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-5">
          <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-brand-700">
            The short version
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {summary.map((line) => (
              <li key={line} className="flex gap-2.5 text-[14px] leading-snug text-ink">
                <Icon name="check" size={16} className="mt-0.5 shrink-0 text-brand-600" />
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12.5px] text-ink-2">
            The short version is a summary and the sections below are what actually applies.
          </p>
        </section>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
          <nav aria-label="On this page" className="lg:sticky lg:top-8 lg:self-start">
            <div className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
              On this page
            </div>
            <ol className="mt-2.5 flex flex-col gap-1">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex gap-2 rounded-lg px-2 py-1.5 text-[13px] text-ink-2 hover:bg-wash hover:text-brand-600"
                  >
                    <span className="num text-muted">{i + 1}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex flex-col gap-9">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-8">
                <h2 className="h-tight flex items-baseline gap-2.5 text-[20px] text-ink">
                  <span className="num text-[14px] text-muted">{i + 1}</span>
                  {s.title}
                </h2>
                <div className="legal mt-3 flex flex-col gap-3 text-[14.5px] leading-relaxed text-ink-2">
                  {s.body}
                </div>
              </section>
            ))}
          </div>
        </div>

        <footer className="mt-14 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-6 text-[13px] text-muted">
          <Link href="/privacy" className="hover:text-brand-600">Privacy</Link>
          <Link href="/terms" className="hover:text-brand-600">Terms</Link>
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="ml-auto">© {new Date().getFullYear()} {BRAND.name}</span>
        </footer>
      </div>
    </main>
  );
}

/** A definition-style row, used for the lists of who gets what. */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-line py-3 last:border-0 sm:grid-cols-[210px_1fr] sm:gap-5">
      <div className="text-[14px] font-semibold text-ink">{label}</div>
      <div className="text-[14px] leading-relaxed text-ink-2">{children}</div>
    </div>
  );
}
