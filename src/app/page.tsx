import Link from "next/link";
import { Chip, LinkButton, type Tint } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { currentUser } from "@/lib/auth/current";
import { currentBranch } from "@/lib/tenancy/branch";
import { BranchHome } from "@/app/BranchHome";
import { BRAND } from "@/lib/brand";
import { GoogleAnalytics } from "@/lib/analytics/ga";
import { PlanArt } from "@/components/hero/PlanArt";
import { CountUp } from "@/components/hero/CountUp";
import { Testimonials } from "@/components/Testimonials";
import { CountryDuel } from "@/components/CountryDuel";
import { LatestGuides } from "@/components/LatestGuides";
import { Statement } from "@/components/Statement";
import { ServiceShowcase } from "@/components/ServiceShowcase";
import { RATES_AS_OF } from "@/modules/cost/data";
import { TOOL_MARKS } from "@/components/tool-icons";

/**
 * The homepage sells to consultancy owners, not students, a student arrives
 * here already signed by a branch, so their journey starts at /login.
 *
 * Everything on it is written to one rule: one idea per block, and the block
 * stops when the idea does. An owner scrolling for ten seconds should be able
 * to read only the headings and still know what this is. Anything that only
 * restates the heading has been cut rather than shortened.
 */

/** Zero marginal cost, so free forever, which is what makes them usable
 *  across a counsellor's desk in a first meeting. */
const FREE_TOOLS: Array<{
  href: string; name: string; q: string; tint: Tint;
  /** Gets the large tinted card treatment. */
  lead?: boolean;
}> = [
  { href: "/tools/eligibility", name: "Eligibility check", q: "Can this student get in?", tint: "mint", lead: true },
  { href: "/tools/cost", name: "True cost calculator", q: "What will the family pay?", tint: "sky", lead: true },
  { href: "/tools/loan", name: "Education loan EMI", q: "What will the loan cost?", tint: "amber" },
  { href: "/tools/checklist", name: "Application timeline", q: "What is due, and when?", tint: "lilac" },
  { href: "/tools/document-checklist", name: "Document checklist", q: "Which papers?", tint: "peach" },
  { href: "/tools/universities", name: "University finder", q: "Who takes these grades?", tint: "peach" },
  { href: "/tools/scholarships", name: "Scholarship finder", q: "Any funding?", tint: "rose" },
  { href: "/tools/compare", name: "Compare destinations", q: "Australia or the UK?", tint: "sky" },
];

/** The six things an owner is buying. One sentence each, if a card needs a
 *  second sentence, it is two features pretending to be one. */
const PLATFORM = [
  {
    name: "One board for the branch",
    blurb: "Enquiry to departure in eight stages, counsellor, next action and scores on one row.",
  },
  {
    name: "The work stays when a counsellor leaves",
    blurb: "Every stage change, note and document written down as it happens, with a name and a time on it.",
  },
  {
    name: "A chase list, every morning",
    blurb: "Who is stalling, who is overloaded, what went past its date. Names to ring, not a dashboard.",
  },
  {
    name: "Your name over the door",
    blurb: "yourconsultancy.stride.np, your logo, your students, walled off in the database, not in a promise.",
  },
  {
    name: "Parents stop ringing the counsellor",
    blurb: "A read-only progress and cost page, opened with a link and a spoken code. No account to forget.",
  },
  {
    name: "Logins you open in ten seconds",
    blurb: "Type a student's email and their sign-in goes out. You decide what they see.",
  },
];

/** Counted from the code that ships, not rounded up for the headline. */
const SCALE = [
  { v: 8, l: "stages, enquiry to departure" },
  { v: 31, l: "document types tracked" },
  { v: 30, l: "dated steps per intake" },
  { v: 6, l: "destinations" },
];

export default async function Home() {
  // On a consultancy's own address this page is theirs, and is written to the
  // student who was sent here. The pitch below is for the apex only.
  const branch = await currentBranch();
  if (branch) return <BranchHome branch={branch} />;

  const user = await currentUser();

  return (
    <main>
      <GoogleAnalytics />

      {/* --------------------------------------------------------- utility bar */}
      <div className="bg-ink text-white/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-2 text-[12px]">
          <span className="min-w-0">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-brand-300 align-middle" aria-hidden />
            Pilot branches onboarding for <span className="font-semibold text-white">July 2027</span>.
          </span>
          <span className="hidden shrink-0 sm:block">Built in Kathmandu</span>
        </div>
      </div>

      {/* ---------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link href="#platform" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-2 hover:text-brand-600 sm:block">
              The platform
            </Link>
            <Link href="#practice" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-2 hover:text-brand-600 sm:block">
              Students
            </Link>
            <Link href="/tools" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-2 hover:text-brand-600 sm:block">
              Free tools
            </Link>
            <Link href="/blog" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-2 hover:text-brand-600 sm:block">
              Guides
            </Link>
            {user ? (
              <LinkButton href="/app" size="sm">Open my dashboard</LinkButton>
            ) : (
              <>
                <Link href="/login" className="rounded-full px-3 py-2 text-sm font-semibold text-ink-2 hover:text-brand-600">Login</Link>
                <LinkButton href="/signup" size="sm">Set up your branch</LinkButton>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* -------------------------------------------------------------- hero */}
      <section className="wash">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.15fr_.85fr] lg:pt-24">
          <div className="rise text-center lg:text-left">
            <div className="eyebrow">For Nepal&rsquo;s education consultancies</div>
            <h1 className="display mt-4 text-[44px] sm:text-[58px]">
              Forty files open.
              <br />
              {/* The signature cyan is too pale to set type in, so on a light
                  page it does its work as a mark under the word rather than as
                  the word, the one place it appears at full strength outside
                  the dark surfaces. */}
              <span className="relative whitespace-nowrap text-ink">
                Nothing dropped
                <svg className="absolute -bottom-1.5 left-0 w-full text-brand-300" height="10" viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden>
                  <path d="M2 7 Q 40 1, 60 5 T 118 4" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>.
            </h1>
            <p className="mx-auto mt-6 max-w-md text-[17px] leading-relaxed text-ink-2 lg:mx-0">
              One board for every student&rsquo;s stage, next action and documents, running under
              your own name.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <LinkButton href="/signup" size="lg">Set up your branch &rarr;</LinkButton>
              <LinkButton href="#platform" size="lg" variant="secondary">See what you get</LinkButton>
            </div>
            <p className="mt-4 text-[13px] text-muted">
              Invoiced by hand &middot; Walled off from every other branch
            </p>
          </div>

          <div className="rise rise-2 mx-auto w-full max-w-sm lg:max-w-none">
            <PlanArt />
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-5 pb-16">
          <div className="rise rise-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SCALE.map((x) => (
              <div key={x.l} className="rounded-[20px] border border-line bg-white/75 px-4 py-5 text-center">
                <div className="num text-[26px] font-semibold leading-none text-ink sm:text-[28px]">{x.v}</div>
                <div className="mt-1.5 text-[12px] leading-snug text-muted">{x.l}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[11.5px] text-muted">
            In the product today. Nothing on this page is a roadmap.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------- the platform */}
      <section id="platform" className="border-y border-line bg-ink">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <div className="max-w-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-300">The platform</div>
            <h2 className="display mt-3 text-[32px] text-white sm:text-[42px]">
              You know the work. This is the part that gets dropped.
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-white/70">
              Software replaces none of what you know. It holds what slips when forty files are
              open in March. The date nobody diarised, the student who went quiet for five weeks
              and signed with someone else.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {PLATFORM.map((c) => (
              <div key={c.name} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                <h3 className="h-tight text-[16px] text-white">{c.name}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/70">{c.blurb}</p>
              </div>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <LinkButton href="/signup" size="md">Set up your branch</LinkButton>
            <span className="text-[13px] text-white/50">One counsellor, five live files. Enough to tell.</span>
          </div>
        </div>
      </section>

      <Statement source="Reported refusal rates for Nepali applicants, 2025 and early 2026.">
        Four in five Nepali applications to the United States were refused last year.
        <span className="text-brand-300"> Every one was somebody&rsquo;s file.</span>
      </Statement>

      {/* -------------------------------------------------- the first meeting */}
      <section className="band-soft border-y border-line">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-signal-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-signal">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal" aria-hidden />
              Free &middot; no account needed
            </span>
            <h2 className="display mt-4 text-[30px] sm:text-[38px]">
              Win the first meeting with numbers.
            </h2>
            <p className="mt-3 text-[16px] leading-relaxed text-ink-2">
              A family walking in has already heard three answers from two other consultancies.
              Put a real figure on the desk and you stop being the third opinion.
            </p>
          </div>

          {/* The two questions every walk-in opens with get a full card each; the
              rest sit underneath as a quiet index. */}
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {FREE_TOOLS.filter((t) => t.lead).map((t) => {
              const Mark = TOOL_MARKS[t.href];
              return (
                <Link
                  key={t.href} href={t.href}
                  className="lift group overflow-hidden rounded-[24px] p-6"
                  style={{ background: `var(--color-tint-${t.tint})` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    {Mark && <Mark tint={t.tint} surface="white" size="lg" />}
                    <span
                      className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold"
                      style={{ color: `var(--color-tint-${t.tint}-ink)` }}
                    >
                      Free
                    </span>
                  </div>
                  <div
                    className="mt-5 text-[12.5px] font-semibold"
                    style={{ color: `var(--color-tint-${t.tint}-ink)` }}
                  >
                    {t.q}
                  </div>
                  <h3 className="h-tight mt-1 text-[23px] font-bold text-ink">{t.name}</h3>
                  <span
                    className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.06em] group-hover:underline sm:min-h-0"
                    style={{ color: `var(--color-tint-${t.tint}-ink)` }}
                  >
                    Open it <span aria-hidden>&#8599;</span>
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FREE_TOOLS.filter((t) => !t.lead).map((t) => {
              const Mark = TOOL_MARKS[t.href];
              return (
                <Link
                  key={t.href} href={t.href}
                  className="lift group flex gap-3.5 rounded-[20px] border border-line bg-panel p-4 hover:border-brand-400"
                >
                  {Mark && <Mark tint={t.tint} />}
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-brand-600">{t.q}</div>
                    <h3 className="h-tight mt-0.5 text-[15.5px] group-hover:text-brand-600">{t.name}</h3>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* The figures the cost tool quotes. On the desk this strip is the
              moment a family stops guessing, so it belongs beside the tools. */}
          <div className="mt-10 rounded-[24px] border border-line bg-panel p-6">
            <p className="text-[12px] font-semibold uppercase tracking-[0.13em] text-muted">
              The kind of figure that ends an argument
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { v: 29710, pre: "AUD ", l: "Australia, living costs" },
                { v: 23448, pre: "CAD ", l: "Canada, from Sept 2026" },
                { v: 10539, pre: "£", l: "UK, outside London" },
                { v: 20000, pre: "NZD ", l: "New Zealand, per year" },
              ].map((x) => (
                <div key={x.l} className="rounded-[16px] bg-wash px-4 py-4 text-center">
                  <div className="num text-[22px] font-semibold leading-none text-ink sm:text-[24px]">
                    <span className="text-[14px] text-muted">{x.pre}</span>
                    <CountUp value={x.v} />
                  </div>
                  <div className="mt-1.5 text-[12px] leading-snug text-muted">{x.l}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
              What each government wants visible in the bank, quoted with its source. Published
              figures, {RATES_AS_OF}, tuition and travel sit on top.
            </p>
          </div>

          <div className="mt-6">
            <LinkButton href="/tools" variant="secondary" size="md">All eight tools &rarr;</LinkButton>
          </div>
        </div>
      </section>

      {/* --------------------------------------------- what preparation buys */}
      <section className="mx-auto max-w-5xl px-5 py-20">
        <div className="text-center">
          <div className="eyebrow">Why the file that departs, departs</div>
          <h2 className="display mt-3 text-[32px] sm:text-[42px]">Two answers. One commission.</h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px] text-ink-2">
            Same student, same family money. The one on the right sat a mock interview months
            earlier and could not answer this.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-line bg-panel p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <Chip tone="brand">Question 4 of 8</Chip>
            <span className="text-[13px] text-muted">Testing: whether the funding story is real</span>
          </div>
          <p className="h-tight mt-4 text-[21px] leading-snug">
            &ldquo;Who is paying your tuition, and can you prove it?&rdquo;
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-danger-600/25 bg-danger-100/50 p-5">
              <Chip tone="danger">Scored 3 / 10</Chip>
              <p className="mt-3 text-[15px] leading-relaxed text-ink">
                &ldquo;My father will sponsor me. He has a good business in Chitwan and our financial
                condition is strong, so there will be no problem.&rdquo;
              </p>
              <p className="mt-4 border-t border-danger-600/20 pt-3 text-[13px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-danger-600">Fails.</strong> Not one number, 
                what an officer hears from someone never walked through their own bank documents.
              </p>
            </div>

            <div className="rounded-xl border border-teal-500/30 bg-teal-100/50 p-5">
              <Chip tone="teal">Scored 9 / 10</Chip>
              <p className="mt-3 text-[15px] leading-relaxed text-ink">
                &ldquo;My father. Registered construction supply business in Bharatpur, declared NPR 42
                lakh last year. I have the tax clearance and audited statements. With a NPR 35 lakh
                loan against our land, that covers first-year tuition of AUD 34,000 and living
                costs.&rdquo;
              </p>
              <p className="mt-4 border-t border-teal-500/25 pt-3 text-[13px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-teal-700">Passes.</strong> Four checkable
                facts in twenty seconds. The officer stops digging.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <p className="max-w-md text-[14px] text-muted">
              A refusal costs you the commission and the next three families who hear about it.
            </p>
            <LinkButton href="#practice" size="sm" variant="secondary">See what runs the drill</LinkButton>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- practice */}
      <section id="practice" className="band-tint border-y border-line">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="max-w-2xl">
            <div className="eyebrow">What your students get</div>
            <h2 className="display mt-3 text-[32px] sm:text-[42px]">
              The rehearsal you cannot sit through forty times.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-2">
              Nobody has the hours to mark every writing task or play the visa officer twice a
              week. These do, and the score lands back on your board.
            </p>
          </div>

          <ServiceShowcase />

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <LinkButton href="/signup" size="lg">Run these for your students</LinkButton>
            <span className="text-[13px] text-muted">
              Students never sign up here, you open their login.
            </span>
          </div>
        </div>
      </section>

      <Testimonials />

      <Statement tone="wash" source="No-objection certificates issued by Nepal's Ministry of Education, 2023 and 2025.">
        123,092 Nepalis got an NOC last year.
        <span className="text-brand-600"> Every one picked a consultancy first.</span>
      </Statement>

      {/* ------------------------------------------------------- country duel */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="max-w-2xl">
          <div className="eyebrow">Two countries, side by side</div>
          <h2 className="display mt-3 text-[32px] sm:text-[42px]">
            &ldquo;My uncle says Australia.&rdquo;
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-2">
            You have had this conversation a thousand times. Here it is on a screen you can turn
            around.
          </p>
        </div>

        <div className="mt-9">
          <CountryDuel />
        </div>
      </section>

      <Statement>
        Good consultancies already know what to do.
        <span className="text-brand-300"> STRIDE makes sure none of it gets missed.</span>
      </Statement>

      <LatestGuides />

      {/* ------------------------------------------------------- closing call */}
      <section className="border-y border-line bg-wash">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center">
          <h2 className="display text-[32px] sm:text-[42px]">Start with one counsellor.</h2>
          <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-ink-2">
            Five live files, a fortnight. No card, pilots are invoiced by hand.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <LinkButton href="/signup" size="lg">Set up your branch &rarr;</LinkButton>
            <LinkButton href="/login" size="lg" variant="secondary">I have an account</LinkButton>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ footer */}
      <footer className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-wrap items-start justify-between gap-8 border-t border-line pt-8">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              The platform Nepal&rsquo;s education consultancies run their branches on. The
              calculators are free for anyone.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-4 text-[13px]">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">For consultancies</span>
              <Link href="#platform" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">The platform</Link>
              <Link href="#practice" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">What students get</Link>
              <Link href="/signup" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">Set up your branch</Link>
              <Link href="/login" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">Login</Link>
              <Link href="/blog" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">Guides</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Free tools</span>
              {FREE_TOOLS.map((t) => (
                <Link key={t.href} href={t.href} className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">{t.name}</Link>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-8 text-[12px] text-muted">© {new Date().getFullYear()} {BRAND.name} · Made in Kathmandu</p>
      </footer>
    </main>
  );
}
