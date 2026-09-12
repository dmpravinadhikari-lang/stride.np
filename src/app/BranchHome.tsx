import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Eyebrow, LinkButton } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { currentUser } from "@/lib/auth/current";
import { GoogleAnalytics } from "@/lib/analytics/ga";
import type { Branch } from "@/lib/tenancy/branch";

/**
 * A consultancy's own front page.
 *
 * The apex homepage sells the platform to consultancy owners. On a branch
 * address the visitor is a student who was told to come here by the
 * consultancy that signed them, so selling them a platform is the wrong page
 * entirely — this one is written to them, under the consultancy's name.
 */

/** What a student gets once they are signed in. Each line is something built. */
const INCLUDED = [
  {
    name: "Your plan, with dates on it",
    blurb:
      "Thirty steps counted backwards from your intake month, so you can see what is late today rather than in March.",
  },
  {
    name: "Papers checked, not guessed",
    blurb:
      "Upload once. Your counsellor marks each one verified, and you see what is still missing.",
  },
  {
    name: "The true cost, in rupees",
    blurb:
      "Tuition, visa, flights and the first three months of living — and, separately, the balance the country wants shown.",
  },
  {
    name: "IELTS practice that is marked",
    blurb:
      "Timed sections, instant marking for Listening and Reading, band scores with reasons for Writing and Speaking.",
  },
  {
    name: "Your statement, worked on",
    blurb:
      "Draft it here, then go through it line by line against the sentences that get an SOP refused.",
  },
  {
    name: "Your parents can follow it",
    blurb:
      "A read-only progress and cost page, opened with a link and a code said over the phone. No account for them to forget.",
  },
];

/** The four most-asked questions, answered with no account at all. */
const TOOLS = [
  { href: "/tools/cost", name: "True cost calculator", q: "What will the family actually pay?" },
  { href: "/tools/eligibility", name: "Eligibility check", q: "Can you get in, and get the visa?" },
  { href: "/tools/loan", name: "Education loan EMI", q: "What does the loan cost a month?" },
  { href: "/tools/universities", name: "University finder", q: "Who takes your grades?" },
];

export async function BranchHome({ branch }: { branch: Branch }) {
  const user = await currentUser();

  return (
    <main className="bg-canvas">
      <GoogleAnalytics />

      {/* ---------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link
              href="/tools"
              className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-2 hover:text-brand-600 sm:block"
            >
              Free tools
            </Link>
            <Link
              href="/blog"
              className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-2 hover:text-brand-600 sm:block"
            >
              Guides
            </Link>
            {user ? (
              <LinkButton href="/app" size="sm">Open my file</LinkButton>
            ) : (
              <LinkButton href="/login" size="sm">Log in</LinkButton>
            )}
          </nav>
        </div>
      </header>

      {/* -------------------------------------------------------------- hero */}
      <section className="border-b border-line bg-wash">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
          <Eyebrow>Study abroad from Nepal</Eyebrow>
          <h1 className="display mt-3 max-w-3xl text-[38px] leading-[1.06] tracking-[-0.03em] sm:text-[52px]">
            Everything about your application, in one place.
          </h1>
          <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-ink-2">
            {branch.name} works your file here: every step with a date on it, every document
            checked by a person, and what the whole thing costs in rupees before you commit to
            any of it.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {user ? (
              <LinkButton href="/app" size="lg">Open my file →</LinkButton>
            ) : (
              <LinkButton href="/login" size="lg">Log in to your file →</LinkButton>
            )}
            <Link
              href="/tools"
              className="inline-flex min-h-11 items-center rounded-full border border-line-2 bg-white px-5 text-[14.5px] font-semibold text-ink hover:border-brand-400"
            >
              Use the free tools
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-muted">
            No login yet? {branch.name} opens it for you — ask your counsellor.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------- what you get */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <Eyebrow>Once you are signed in</Eyebrow>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INCLUDED.map((item) => (
            <div key={item.name} className="rounded-2xl border border-line bg-panel p-6">
              <h3 className="display text-[18px] leading-snug">{item.name}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{item.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- tools */}
      <section className="border-y border-line bg-panel">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <Eyebrow>Free, and no account needed</Eyebrow>
          <h2 className="display mt-3 text-[28px] tracking-[-0.02em] sm:text-[34px]">
            Work out the answer before you walk in.
          </h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group rounded-2xl border border-line bg-canvas p-5 hover:border-brand-400"
              >
                <div className="text-[15.5px] font-semibold text-ink group-hover:text-brand-600">
                  {tool.name}
                </div>
                <div className="mt-1 text-[13.5px] text-muted">{tool.q}</div>
              </Link>
            ))}
          </div>
          <Link
            href="/tools"
            className="mt-6 inline-flex min-h-11 items-center text-[14px] font-semibold text-brand-600 hover:text-brand-700"
          >
            All eight free tools →
          </Link>
        </div>
      </section>

      {/* ----------------------------------------------------------- contact */}
      {(branch.contact_email || branch.contact_phone) && (
        <section className="mx-auto max-w-5xl px-5 py-16">
          <Eyebrow>Talk to someone</Eyebrow>
          <h2 className="display mt-3 text-[26px] tracking-[-0.02em]">
            {branch.name} is the one working your file.
          </h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {branch.contact_email && (
              <a
                href={`mailto:${branch.contact_email}`}
                className="inline-flex min-h-11 items-center rounded-full border border-line-2 bg-panel px-5 text-[14.5px] font-semibold text-ink hover:border-brand-400"
              >
                {branch.contact_email}
              </a>
            )}
            {branch.contact_phone && (
              <a
                href={`tel:${branch.contact_phone.replace(/\s+/g, "")}`}
                className="inline-flex min-h-11 items-center rounded-full border border-line-2 bg-panel px-5 text-[14.5px] font-semibold text-ink hover:border-brand-400"
              >
                {branch.contact_phone}
              </a>
            )}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ footer */}
      <footer className="border-t border-line bg-panel">
        <div className="mx-auto max-w-5xl px-5 py-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-sm">
              <Logo />
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                Study abroad counselling from Nepal, worked file by file.
              </p>
            </div>
            <nav className="flex flex-col gap-2 text-[13px]">
              <Link href="/tools" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">Free tools</Link>
              <Link href="/blog" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">Guides</Link>
              <Link href="/login" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">Log in</Link>
            </nav>
          </div>
          <p className="mt-8 text-[12px] text-muted">
            © {new Date().getFullYear()} {branch.name} · Powered by {BRAND.name}
          </p>
        </div>
      </footer>
    </main>
  );
}
