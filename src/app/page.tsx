import Link from "next/link";
import { Chip, LinkButton, type Tint } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { currentUser } from "@/lib/auth/current";
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

/** Zero marginal cost, so free forever and open to anyone. */
const FREE_TOOLS: Array<{
  href: string; name: string; q: string; tint: Tint;
  /** Gets the large tinted card treatment. */
  lead?: boolean;
}> = [
  { href: "/tools/eligibility", name: "Eligibility check", q: "Can I even get in?", tint: "mint", lead: true },
  { href: "/tools/cost", name: "True cost calculator", q: "What does it really cost?", tint: "sky", lead: true },
  { href: "/tools/loan", name: "Education loan EMI", q: "What will the loan cost?", tint: "amber" },
  { href: "/tools/checklist", name: "Application timeline", q: "When do I do what?", tint: "lilac" },
  { href: "/tools/document-checklist", name: "Document checklist", q: "What papers do I need?", tint: "peach" },
  { href: "/tools/universities", name: "University finder", q: "Where can I get in?", tint: "peach" },
  { href: "/tools/scholarships", name: "Scholarship finder", q: "Is there any funding?", tint: "rose" },
  { href: "/tools/compare", name: "Compare destinations", q: "Australia or the UK?", tint: "sky" },
];

const CONSULTANCY = [
  { name: "Student pipeline", blurb: "Enquiry to departure in eight stages, with every student's counsellor, next action and practice scores on one board." },
  { name: "A record of everything", blurb: "Every stage change, document, call note and practice attempt written down as it happens, with a name and a time against it. When a parent asks what has been done, the answer is on the screen." },
  { name: "Accounts you open", blurb: "Enter a student's email and their sign-in details are sent for you. They follow their own file from their phone; you keep control of what they can see." },
  { name: "Your own address", blurb: "yourconsultancy.stride.np, your logo, your student list — walled off from every other branch at the database level rather than as a promise." },
  { name: "Reports", blurb: "Who is stalling, who is carrying what, and what needs chasing this morning. Rates always shown with the count behind them." },
  { name: "Parent view", blurb: "A progress and cost page for the people paying, opened by a link and a spoken code. No account for them to forget." },
];

export default async function Home() {
  const user = await currentUser();

  return (
    <main>
      <GoogleAnalytics />

      {/* --------------------------------------------------------- utility bar */}
      <div className="bg-ink text-white/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-2 text-[12px]">
          <span className="min-w-0">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-signal align-middle" aria-hidden />
            Applying for <span className="font-semibold text-white">July 2027</span>? You should already have started.
          </span>
          <span className="hidden shrink-0 sm:block">Built in Kathmandu</span>
        </div>
      </div>

      {/* ---------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link href="/tools" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-2 hover:text-brand-600 sm:block">
              Free tools
            </Link>
            <Link href="/blog" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-2 hover:text-brand-600 sm:block">
              Guides
            </Link>
            <Link href="#practice" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-2 hover:text-brand-600 sm:block">
              Practice
            </Link>
            <Link href="#consultancies" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-2 hover:text-brand-600 sm:block">
              For consultancies
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
            <h1 className="display text-[44px] sm:text-[58px]">
              Plan it{" "}
              <span className="relative whitespace-nowrap text-signal">
                NOW
                <svg className="absolute -bottom-1.5 left-0 w-full" height="10" viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden>
                  <path d="M2 7 Q 40 1, 60 5 T 118 4" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity=".35" />
                </svg>
              </span>.
              <br />
              <span className="text-brand-500">Not three weeks before the deadline.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-md text-[17px] leading-relaxed text-ink-2 lg:mx-0">
              Thirty dated steps between deciding and boarding.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <LinkButton href="/signup" size="lg">Set up your consultancy →</LinkButton>
              <LinkButton href="/tools" size="lg" variant="secondary">Try the free tools</LinkButton>
            </div>
            <p className="mt-4 text-[13px] text-muted">
              Free calculators for anyone &middot; Your full file through your consultancy
            </p>
          </div>

          <div className="rise rise-2 mx-auto w-full max-w-sm lg:max-w-none">
            <PlanArt />
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-5 pb-16">
          <p className="mb-3 text-center text-[12px] font-semibold uppercase tracking-[0.13em] text-muted">
            What each government wants to see in the bank
          </p>
          <div className="rise rise-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { v: 29710, s: "", pre: "AUD ", l: "Australia, living costs — before tuition" },
              { v: 23448, s: "", pre: "CAD ", l: "Canada, from September 2026" },
              { v: 10539, s: "", pre: "£", l: "UK, nine months outside London" },
              { v: 20000, s: "", pre: "NZD ", l: "New Zealand, per year of study" },
            ].map((x) => (
              <div key={x.l} className="rounded-[20px] border border-line bg-white/75 px-4 py-5 text-center">
                <div className="num text-[24px] font-semibold leading-none text-ink sm:text-[26px]">
                  <span className="text-[15px] text-muted">{x.pre}</span>
                  <CountUp value={x.v} suffix={x.s} />
                </div>
                <div className="mt-1.5 text-[12px] leading-snug text-muted">{x.l}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[11.5px] text-muted">
            Published figures from each immigration authority, checked {RATES_AS_OF}. Tuition and
            travel sit on top of every one of these.
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------- free tools */}
      <section className="band-sky border-y border-line">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-signal-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-signal">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal" aria-hidden />
              Free · no account needed
            </span>
            <h2 className="display mt-4 text-[30px] sm:text-[38px]">
              Start with the question you actually have.
            </h2>
            <p className="mt-3 text-[16px] leading-relaxed text-ink-2">
              These are calculations and lookups, so they cost us nothing to run and they are free
              forever. No sign-up, no phone number, and nobody calling you afterwards. Counsellors
              use them across the desk on the first visit; students use them at home at midnight.
            </p>
          </div>

          {/* The two questions everyone walks in with get a full card each; the
              rest sit underneath as a quiet index. Same treatment as the tools
              page, so arriving there feels like the same product. */}
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

          <div className="mt-6">
            <LinkButton href="/tools" variant="secondary" size="md">All free tools →</LinkButton>
          </div>
        </div>
      </section>

      <Statement source="Reported refusal rates for Nepali applicants, 2025 and early 2026.">
        Four in five Nepali applications to the United States were refused last year.
        <span className="text-signal"> Preparation stopped being optional.</span>
      </Statement>

      {/* --------------------------------------------- why early matters */}
      <section className="mx-auto max-w-5xl px-5 py-20">
        <div className="text-center">
          <div className="eyebrow">Why the planning is the point</div>
          <h2 className="display mt-3 text-[32px] sm:text-[42px]">Two answers. One visa.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] text-ink-2">
            Same question, same student, same family money. The student on the right did not get
            lucky on the day — they knew their own numbers months earlier, because something made
            them work them out.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-line bg-panel p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <Chip tone="brand">Question 4 of 8</Chip>
            <span className="text-[13px] text-muted">Testing: whether the funding story is real</span>
          </div>
          <p className="h-tight mt-4 text-[21px] leading-snug">
            “Who is paying your tuition, and can you prove it?”
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-danger-600/25 bg-danger-100/50 p-5">
              <Chip tone="danger">Scored 3 / 10</Chip>
              <p className="mt-3 text-[15px] leading-relaxed text-ink">
                “My father will sponsor me. He has a good business in Chitwan and our financial
                condition is strong, so there will be no problem.”
              </p>
              <p className="mt-4 border-t border-danger-600/20 pt-3 text-[13px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-danger-600">Why it fails.</strong> Not one
                number. “Good business” and “no problem” are what an officer hears from someone who
                has never seen their own bank documents.
              </p>
            </div>

            <div className="rounded-xl border border-teal-500/30 bg-teal-100/50 p-5">
              <Chip tone="teal">Scored 9 / 10</Chip>
              <p className="mt-3 text-[15px] leading-relaxed text-ink">
                “My father. He runs a registered construction supply business in Bharatpur and
                declared NPR 42 lakh last year — I have his tax clearance and audited statements.
                With a NPR 35 lakh education loan against our land, that covers first-year tuition
                of AUD 34,000 and living costs.”
              </p>
              <p className="mt-4 border-t border-teal-500/25 pt-3 text-[13px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-teal-700">Why it passes.</strong> Four
                checkable facts in twenty seconds. The officer stops digging because there is
                nothing left to find.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <p className="max-w-lg text-[14px] text-muted">
              Every one of those figures comes from work done months earlier — costing the course,
              sizing the loan, collecting the tax clearance. That is what the free tools are for.
            </p>
            <LinkButton href="/tools/cost" size="sm" variant="secondary">Work out your figures</LinkButton>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- practice */}
      <section id="practice" className="band-lilac border-y border-line">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="max-w-2xl">
            <div className="eyebrow">Through your consultancy</div>
            <h2 className="display mt-3 text-[32px] sm:text-[42px]">
              Then rehearse the parts that are marked.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-2">
              These come with your consultancy's account, and your counsellor decides which of them
              you need at the stage you are actually at. Everything reads from one file, so the
              interviewer already knows what your mock test said, the document check already knows
              what your profile claims, and your counsellor sees all of it without asking you to
              repeat yourself.
            </p>
          </div>

          <ServiceShowcase />

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <LinkButton href="/signup" size="lg">Run these for your students</LinkButton>
            <span className="text-[13px] text-muted">
              Already with a consultancy? They will send your sign-in details.
            </span>
          </div>
        </div>
      </section>

      <Testimonials />

      <Statement tone="wash" source="No-objection certificates issued by Nepal's Ministry of Education, 2023 and 2025.">
        123,092 Nepalis got an NOC last year.
        <span className="text-brand-500"> The paperwork does not care that you are busy.</span>
      </Statement>

      {/* ------------------------------------------------------- country duel */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="max-w-2xl">
          <div className="eyebrow">Two countries, side by side</div>
          <h2 className="display mt-3 text-[32px] sm:text-[42px]">
            Most families choose on hearsay.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-2">
            An uncle went to Sydney in 2015, so Australia. A neighbour's daughter got refused for
            Canada, so not Canada. Here is the actual comparison — cost, the money you must show,
            work after you graduate, residence odds, earning potential, the size of the Nepali
            community, and which way each country's policy is currently moving.
          </p>
        </div>

        <div className="mt-9">
          <CountryDuel />
        </div>
      </section>

      <Statement>
        Good consultancies already know what to do.
        <span className="text-signal"> STRIDE makes sure none of it gets missed.</span>
      </Statement>

      <LatestGuides />

      {/* ---------------------------------------------------- consultancies */}
      <section id="consultancies" className="border-y border-line bg-ink">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="max-w-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-400">For consultancies</div>
            <h2 className="display mt-3 text-[30px] text-white sm:text-[38px]">
              Run all of it under your own name.
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-white/70">
              You know this work. You know which university takes which grades, which officer asks
              which question, and which family needs a call rather than an email. None of that is
              something software replaces.
            </p>
            <p className="mt-3 text-[15.5px] leading-relaxed text-white/70">
              What software is good at is the part that gets dropped when forty files are open at
              once: the date nobody diarised, the document nobody chased, the note nobody wrote
              down. STRIDE holds that, under your name, so your counsellors can spend their hours
              on the students instead of the admin.
            </p>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            {CONSULTANCY.map((c) => (
              <div key={c.name} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                <h3 className="h-tight text-[16px] text-white">{c.name}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/70">{c.blurb}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <LinkButton href="/signup" size="md">Set up your consultancy</LinkButton>
            <span className="text-[13px] text-white/50">No payment gateway yet — pilots are invoiced by hand.</span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ footer */}
      <footer className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-wrap items-start justify-between gap-8 border-t border-line pt-8">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Plan your study abroad from Nepal properly — the cost, the paperwork, the deadlines
              and the practice. Free tools for students, and the platform consultancies run them on.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-4 text-[13px]">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Free tools</span>
              {FREE_TOOLS.map((t) => (
                <Link key={t.href} href={t.href} className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">{t.name}</Link>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{BRAND.name}</span>
              <Link href="/tools" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">All tools</Link>
              <Link href="/blog" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">Guides</Link>
              <Link href="#practice" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">AI practice</Link>
              <Link href="/login" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">Student login</Link>
              <Link href="/signup" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">Set up your branch</Link>
              <Link href="#consultancies" className="inline-flex min-h-[40px] items-center text-ink-2 hover:text-brand-600">For consultancies</Link>
            </div>
          </div>
        </div>
        <p className="mt-8 text-[12px] text-muted">© {new Date().getFullYear()} {BRAND.name} · Made in Kathmandu</p>
      </footer>
    </main>
  );
}
