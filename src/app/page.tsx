import Image from "next/image";
import Link from "next/link";
import { Logo, Ridge } from "@/components/Logo";
import { Icon, type IconName } from "@/components/Icon";
import { currentUser } from "@/lib/auth/current";
import { BRAND } from "@/lib/brand";
import { GoogleAnalytics } from "@/lib/analytics/ga";
import { PLANS } from "@/lib/plans";
import { STUDENT_JOURNEY, perStudent, studentsCovered } from "@/lib/credits-explained";
import { PricingCards } from "./pricing-cards";
import { FeatureBento } from "@/components/FeatureBento";
import { Reveal } from "@/components/Reveal";

/**
 * The homepage sells to consultancy owners. Nobody else.
 *
 * Three deliberate departures from the way a page like this is usually built,
 * because the usual way is what makes every SaaS homepage look like the same
 * homepage:
 *
 *   The hero is not centred. A left column of type against a dark ground,
 *   with the product bleeding off the right edge, so the first thing the eye
 *   meets is the interface rather than a slogan with air around it.
 *
 *   Capabilities are a ruled list, not a grid of icons in circles. Twelve
 *   identical cards say "we have twelve things" and nothing else.
 *
 *   Depth comes from ink: a dark hero, a dark plan card lifted out of its
 *   row, screenshots with real shadows, and a fine grain over the dark
 *   sections. No gradient text, no glass, no floating blobs.
 */

export const metadata = {
  title: `${BRAND.name}, software for education consultancies`,
  description:
    "One system for every branch: student pipeline, attendance, documents, payroll and market research. Priced in NPR, USD, GBP, AUD, CAD and EUR. Free to start on your own subdomain.",
};

/** A fine grain, so a dark section has a surface instead of being a slab. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.38'/%3E%3C/svg%3E\")";

function Shot({
  src, alt, width = 1440, height = 900, className = "", priority = false,
}: { src: string; alt: string; width?: number; height?: number; className?: string; priority?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-xl bg-panel shadow-[0_30px_70px_-30px_rgba(15,23,42,.55)] ring-1 ring-black/10 ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-line bg-wash px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-danger-600/45" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent-500/55" />
        <span className="h-2.5 w-2.5 rounded-full bg-teal-500/55" />
        <span className="ml-2 truncate text-[11.5px] text-muted">yourname.{BRAND.domain}</span>
      </div>
      <Image src={src} alt={alt} width={width} height={height} priority={priority} className="block w-full" />
    </div>
  );
}

/** Where students go, which is how a consultancy describes itself. */
const DESTINATIONS = ["Australia", "United Kingdom", "Canada", "United States", "New Zealand", "Ireland", "Japan", "South Korea"];

/*
 * The student tools, as cards rather than as a list of sentences.
 *
 * Each carries its own tint, which is the only thing distinguishing eight
 * items that would otherwise be eight paragraphs of the same grey. The blurb
 * is cut to a handful of words: the name says what it is, and anybody who
 * wants the detail presses it.
 */
const FOR_STUDENTS: Array<{ icon: IconName; name: string; blurb: string; href: string; tint: string; ink: string }> = [
  { icon: "file", name: "IELTS and PTE mocks", blurb: "Full papers, marked with a band.", href: "/tools", tint: "bg-tint-sky", ink: "text-tint-sky-ink" },
  { icon: "mic", name: "AI visa interview", blurb: "Rehearsal that has read the file.", href: "/tools", tint: "bg-tint-lilac", ink: "text-tint-lilac-ink" },
  { icon: "pen", name: "SOP studio", blurb: "Draft, then scored against the real thing.", href: "/tools", tint: "bg-tint-mint", ink: "text-tint-mint-ink" },
  { icon: "checklist", name: "Eligibility check", blurb: "In, and through the visa.", href: "/tools/eligibility", tint: "bg-tint-amber", ink: "text-tint-amber-ink" },
  { icon: "calculator", name: "True cost, any currency", blurb: "Tuition to flights, plus the bank balance.", href: "/tools/cost", tint: "bg-tint-rose", ink: "text-tint-rose-ink" },
  { icon: "bank", name: "Education loan EMI", blurb: "What the loan really costs.", href: "/tools/loan", tint: "bg-tint-peach", ink: "text-tint-peach-ink" },
  { icon: "cap", name: "University finder", blurb: "These grades, this budget, this intake.", href: "/tools/universities", tint: "bg-tint-sky", ink: "text-tint-sky-ink" },
  { icon: "file", name: "CV maker", blurb: "Laid out the way admissions read it.", href: "/tools", tint: "bg-tint-mint", ink: "text-tint-mint-ink" },
];

const SECURITY: Array<{ icon: IconName; name: string; blurb: string }> = [
  { icon: "lock", name: "Documents are sealed on disk", blurb: "Encrypted before they touch the server. A stolen backup is ciphertext." },
  { icon: "people", name: "One consultancy cannot see another", blurb: "Filtered by consultancy before a query runs, not by a setting." },
  { icon: "building", name: "A branch sees its own office", blurb: "Editing the address bar widens nothing. We test that it does not." },
  { icon: "wallet", name: "Salaries are not in the CRM", blurb: "A band on the staff list. Figures sit behind payroll's own permission." },
  { icon: "file", name: "Opening payroll is recorded", blurb: "Who opened what, and when. Nothing here deletes that trail." },
  { icon: "settings", name: "Eleven positions, not two", blurb: "A receptionist writes enquiries and cannot open a bank letter." },
];

const cap = (n: number) => (n === Number.POSITIVE_INFINITY ? "Unlimited" : String(n));

const COMPARE: Array<{ label: string; note?: string; value: (id: "starter" | "growth" | "pro") => string | boolean }> = [
  { label: "Active students", note: "Departed and lost files do not count", value: (id) => cap(PLANS[id].maxStudents) },
  { label: "Offices", value: (id) => cap(PLANS[id].maxBranches) },
  { label: "AI credits a month", value: (id) => PLANS[id].monthlyCredits.toLocaleString("en-US") },
  { label: "Staff accounts", note: "Counsellors, admins, everyone", value: () => "Unlimited" },
  { label: "Student board, tasks, documents", value: () => true },
  { label: "Attendance with a geofence", value: () => true },
  { label: "Payroll", value: (id) => id !== "starter" },
  { label: "Market research", value: (id) => id !== "starter" },
  { label: "Partners and commission", value: (id) => id !== "starter" },
  { label: "Office comparison", note: "Side by side, once you have two", value: (id) => PLANS[id].maxBranches > 1 },
  { label: "Export of your own data", note: "Ask us and we send it", value: () => true },
];

const FAQ = [
  { q: "What happens when we pass the student limit?", a: "Nothing breaks and nothing is deleted. Adding the next student asks you to move up a plan, and moving a departed student on frees a place, because only active files count." },
  { q: "Do we pay per counsellor?", a: "No. Staff accounts are unlimited on every plan. You pay for the office, not for seats, because charging per seat makes an owner ration logins." },
  { q: "Which currency are we billed in?", a: "Invoices are raised in Nepali rupees. The other currencies here exist so a partner or an investor reading this page does not have to do the arithmetic." },
  { q: "What if we run out of credits?", a: "The AI tools pause until the first of the month. The board, attendance, documents, payroll and reports do not use credits and keep working." },
];

const PLAN_ROWS = [
  { id: "starter", for: "One office finding its feet", lines: ["25 active students, one office", "Board, tasks and documents", "Attendance with a geofence", "Unlimited staff accounts"] },
  { id: "growth", for: "An established consultancy", featured: true, lines: ["100 active students, three offices", "Everything in Starter", "Payroll by the Nepali month", "Market research", "Partners and commission"] },
  { id: "pro", for: "Multi-branch or franchise", lines: ["Unlimited students and offices", "Everything in Growth", "Office comparison for head office", "Priority support"] },
] as const;

export default async function Home() {
  const user = await currentUser();

  const cards = PLAN_ROWS.map((r) => ({
    id: r.id,
    label: PLANS[r.id].label,
    for: r.for,
    npr: PLANS[r.id].priceNpr,
    credits: PLANS[r.id].monthlyCredits,
    students: studentsCovered(PLANS[r.id].monthlyCredits),
    lines: [...r.lines],
    featured: "featured" in r ? Boolean(r.featured) : false,
  }));

  return (
    <main className="bg-canvas">
      <GoogleAnalytics />

      {/* ============================================================== hero */}
      {/*
        Paper, not Navy.

        The brand book sets the rhythm of a page and it starts light: a Paper
        hero with the ridge along its bottom, then alternating Paper and Mist,
        then one Navy band that carries the proof, then the Navy footer. A
        dark hero would spend the whole Navy budget in the first screen and
        leave the band that matters looking like more of the same.
      */}
      <section className="relative overflow-hidden bg-canvas">
        <header className="relative z-20">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5">
            <Logo href="/" size={28} />
            <nav className="flex items-center gap-1">
              {[["Product", "#product"], ["For students", "#students"], ["Security", "#security"], ["Pricing", "#pricing"]].map(([label, href]) => (
                <Link
                  key={href} href={href}
                  className="hidden rounded-full px-3 py-2 text-[15px] font-medium text-muted transition-colors hover:text-ink md:block"
                >
                  {label}
                </Link>
              ))}
              {user ? (
                <Link href="/app" className="ml-2 inline-flex min-h-[40px] items-center rounded-[10px] bg-brand-600 px-5 text-[14.5px] font-semibold text-white hover:bg-brand-700">
                  Open my dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" className="px-3 py-2 text-[15px] font-medium text-muted hover:text-ink">Log in</Link>
                  {/* The one orange button above the fold. */}
                  <Link href="/signup" className="ml-1 inline-flex min-h-[40px] items-center rounded-[10px] bg-brand-600 px-5 text-[14.5px] font-semibold text-white transition-colors hover:bg-brand-700">
                    Start free
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid max-w-[1200px] items-center gap-10 px-6 pb-24 pt-10 lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)] lg:pb-32 lg:pt-16">
          <div>
            <h1 className="display text-[44px] leading-[1.03] tracking-[-.035em] text-ink sm:text-[56px]">
              Run every office
              <span className="block text-muted">from one screen</span>
            </h1>
            <p className="mt-6 max-w-[27rem] text-[17px] leading-relaxed text-ink-2">
              Enquiries, students, attendance, documents, payroll and market research, in one
              system, across every office you have.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {/* Navy, not orange: the header already spends the one orange
                  button the brand book allows above the fold. */}
              <Link href="/signup" className="inline-flex min-h-[50px] items-center rounded-[10px] bg-ink px-7 text-[15px] font-semibold text-white transition-colors hover:bg-ink-2">
                Start free
              </Link>
              <Link href="#product" className="inline-flex min-h-[50px] items-center gap-2 rounded-[10px] border border-line-2 bg-panel px-6 text-[15px] font-medium text-ink transition-colors hover:border-brand-400">
                See the product <Icon name="arrow" size={16} />
              </Link>
            </div>

            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
              {[["8", "destinations covered"], ["6", "currencies"], ["2", "calendars, BS and AD"]].map(([n, label]) => (
                <div key={label}>
                  <dt className="num text-[26px] font-medium leading-none text-ink">{n}</dt>
                  <dd className="mt-1.5 text-[12.5px] leading-snug text-muted">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative lg:-mr-24 xl:-mr-36">
            <div className="hidden lg:absolute lg:-left-16 lg:top-28 lg:block lg:w-[56%] lg:-rotate-[4deg]">
              <Shot src="/product/market.png" alt="Market research inside the product" />
            </div>
            <div className="relative lg:ml-24">
              <Shot src="/product/console.png" alt="The console showing today's work across a consultancy" priority />
            </div>
          </div>
        </div>

        {/* The ridge along the bottom of the hero, as the brand book draws it. */}
        <Ridge height={64} className="relative z-10" />
      </section>

      {/* The line of destinations, on Mist so the bands alternate. */}
      <section className="border-b border-line bg-wash">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4 text-[12.5px] text-muted">
          <span className="font-medium text-ink-2">Built for students going to</span>
          {DESTINATIONS.map((d) => <span key={d}>{d}</span>)}
        </div>
      </section>

      {/* ====================================================== capabilities */}
      <section id="product" className="border-b border-line bg-canvas">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-line bg-panel px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-brand-600">
              The product
            </span>
            <h2 className="display mt-4 text-[34px] leading-tight">Everything the office does</h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2">
              Built for the hours of a consultancy's week, not a general CRM with an education skin.
            </p>
          </div>

          <div className="mt-10">
            <FeatureBento />
          </div>
        </div>
      </section>

      {/* ======================================================= three screens */}
      <section className="border-b border-line bg-wash">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-20 px-6 py-24">
          {[
            {
              eyebrow: "The board",
              title: "Every student, every office, one row each",
              blurb: "Filter to one office, or to follow-ups past their date, then hand the list to a counsellor in one press.",
              shot: "/product/students.png",
              alt: "The student board filtered to one office",
              points: ["A colour per stage", "Head office sees every branch"],
            },
            {
              eyebrow: "Monday morning",
              title: "Reports an owner can act on",
              blurb: "Which office is behind, which channel converts, which files stopped moving.",
              shot: "/product/reports.png",
              alt: "Reports showing office comparison and stalled files",
              points: ["Office by office", "Every number opens its list"],
            },
            {
              eyebrow: "Outside your office",
              title: "The market, beside your own numbers",
              blurb: "What students search for, rule changes with the date they bite, the intake calendar.",
              shot: "/product/market.png",
              alt: "The market page showing search demand and rule changes",
              points: ["Demand by destination", "Rule changes, dated and sourced"],
            },
          ].map((row, i) => (
            <div key={row.title} className={`grid items-center gap-12 lg:grid-cols-2 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <div>
                <div className="text-[12px] font-medium uppercase tracking-[0.12em] text-brand-600">{row.eyebrow}</div>
                <h3 className="display mt-3 text-[28px] leading-tight">{row.title}</h3>
                <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{row.blurb}</p>
                <ul className="mt-6 flex flex-col gap-2.5 border-l-2 border-brand-100 pl-5">
                  {row.points.map((p) => <li key={p} className="text-[14px] text-ink-2">{p}</li>)}
                </ul>
              </div>
              <Shot src={row.shot} alt={row.alt} />
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================= phone */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(820px circle at 80% 12%, rgba(255,122,26,.14) 0%, transparent 55%), radial-gradient(620px circle at 96% 40%, rgba(240,64,122,.10) 0%, transparent 52%)" }} />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[.16] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 lg:grid-cols-[1fr_.8fr]">
          <div>
            <div className="text-[12px] font-medium uppercase tracking-[0.12em] text-brand-300">Branches</div>
            <h2 className="display mt-3 text-[34px] leading-tight">Each office runs itself. You see all of them.</h2>
            <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-white/70">
              A counsellor sees their office. Head office sees all of them, and clocking in means
              being there.
            </p>
            <div className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {[
                ["clock", "Clock-in inside a radius you set"],
                ["building", "Per-office students and register"],
                ["chart", "Head office comparison"],
                ["wallet", "Payroll per office"],
              ].map(([icon, label]) => (
                <div key={label} className="flex items-center gap-3 border-b border-white/10 pb-3 text-[14px] text-white/85">
                  <Icon name={icon as IconName} size={17} className="text-brand-300" />
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto w-full max-w-[280px]">
            <div className="overflow-hidden rounded-[32px] border-[7px] border-black/60 bg-panel shadow-[0_40px_90px_-30px_rgba(0,0,0,.9)]">
              <Image src="/product/phone.png" alt="The product on a phone, showing today's work" width={390} height={780} className="block w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================== student tools */}
      <section id="students" className="border-b border-line bg-canvas">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-xl">
              <h2 className="display text-[32px] leading-tight">What your students get</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
                The practice half. Your counsellor reviews what the machine writes.
              </p>
            </div>
            <Link href="/tools" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line-2 bg-panel px-5 text-[14px] font-medium text-ink hover:border-brand-400 hover:text-brand-600">
              Try the free tools <Icon name="arrow" size={16} />
            </Link>
          </div>

          <div className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {FOR_STUDENTS.map((f) => (
              <Link
                key={f.name} href={f.href}
                className="group flex flex-col rounded-2xl border border-line bg-panel p-4 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[0_14px_30px_-22px_rgba(4,30,73,.5)]"
              >
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${f.tint} ${f.ink} transition-transform duration-300 group-hover:scale-105`}>
                  <Icon name={f.icon} size={20} />
                </span>
                <h3 className="h-tight mt-3.5 text-[15px] text-ink group-hover:text-brand-600">{f.name}</h3>
                <p className="mt-1 flex-1 text-[13px] leading-snug text-muted">{f.blurb}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-600 transition-[gap] group-hover:gap-2">
                  Open <Icon name="arrow" size={14} />
                </span>
              </Link>
            ))}
          </div>

          <p className="mt-8 text-[13.5px] text-muted">
            AI credits are included with every plan. The calculators are free for anyone.
          </p>
        </div>
      </section>

      {/* ========================================================== security */}
      <section id="security" className="border-b border-line bg-wash">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
            <div className="lg:sticky lg:top-20 lg:self-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-100 px-3.5 py-1.5 text-[12.5px] font-medium text-teal-700">
                <Icon name="lock" size={14} /> Data security
              </div>
              <h2 className="display mt-4 text-[32px] leading-tight">You hold passports and bank statements</h2>
              <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-2">
                Families hand you papers they would not put on a photocopier. These are rules the
                software enforces, not promises on a page.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {SECURITY.map((s, i) => (
                <Reveal key={s.name} delay={i * 40}>
                  <li className="flex h-full gap-3 rounded-2xl border border-line bg-canvas p-4 transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-teal-500/40">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-100 text-teal-700">
                      <Icon name={s.icon} size={17} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold leading-snug text-ink">{s.name}</span>
                      <span className="mt-1 block text-[13px] leading-snug text-muted">{s.blurb}</span>
                    </span>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* =========================================================== pricing */}
      <section id="pricing" className="border-b border-line bg-canvas">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="display text-[32px] leading-tight">Three plans</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-2">
            Start free while you set up. Nothing is charged until you ask to be invoiced, there is
            no card on file, and you move between plans as the office grows.
          </p>

          <PricingCards rows={cards} />

          <div className="mt-12 overflow-hidden rounded-2xl ring-1 ring-line">
            <div className="scroll-soft overflow-x-auto">
              <table className="w-full min-w-[640px] text-[13.5px]">
                <thead>
                  <tr className="border-b border-line bg-wash text-left">
                    <th className="px-4 py-3 text-[12px] font-medium uppercase tracking-[0.08em] text-muted">What you get</th>
                    {PLAN_ROWS.map((r) => (
                      <th key={r.id} className="px-4 py-3 text-[13.5px] font-medium text-ink">{PLANS[r.id].label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-panel">
                  {COMPARE.map((row) => (
                    <tr key={row.label} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 text-ink-2">
                        {row.label}
                        {row.note && <span className="mt-0.5 block text-[12px] text-muted">{row.note}</span>}
                      </td>
                      {(["starter", "growth", "pro"] as const).map((id) => {
                        const v = row.value(id);
                        return (
                          <td key={id} className="px-4 py-3">
                            {v === true
                              ? <Icon name="check" size={17} className="text-teal-700" label="Included" />
                              : v === false
                                ? <span className="text-[13px] text-muted">Not included</span>
                                : <span className="num text-ink">{v}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-panel p-7 ring-1 ring-line">
              <h3 className="h-tight text-[17px]">What a credit actually buys</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                Credits are spent on AI work only, and only when somebody presses the button. The
                board, attendance, documents, payroll and reports cost nothing to use.
              </p>
              <ul className="mt-5 divide-y divide-line">
                {STUDENT_JOURNEY.map((item) => (
                  <li key={item.label} className="flex items-baseline gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] text-ink">{item.label}</span>
                      <span className="block text-[12.5px] text-muted">{item.detail}</span>
                    </span>
                    <span className="num shrink-0 text-[14px] font-medium text-ink">{item.credits()}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-line pt-4 text-[13px] text-ink-2">
                One student, prepared end to end: <span className="num font-medium text-ink">{perStudent()} credits</span>.
                Unused credits do not roll over, and running out never locks you out of the office.
              </p>
            </div>

            <div className="rounded-2xl bg-panel p-7 ring-1 ring-line">
              <h3 className="h-tight text-[17px]">The questions owners ask first</h3>
              {/* Folded, not printed. Four answers of four lines each is a wall
                  somebody scrolls past; four questions is a thing they read. */}
              <div className="mt-4 flex flex-col divide-y divide-line">
                {FAQ.map((q) => (
                  <details key={q.q} className="group py-1">
                    <summary className="flex cursor-pointer list-none items-center gap-3 py-3 text-[14px] font-medium text-ink">
                      <span className="flex-1">{q.q}</span>
                      <Icon
                        name="chevron" size={16}
                        className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
                      />
                    </summary>
                    <p className="pb-3 text-[13.5px] leading-relaxed text-muted">{q.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================= start */}
      <section className="border-b border-line bg-wash">
        <div className="mx-auto max-w-5xl px-5 py-24">
          <div className="grid gap-10 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <h2 className="display text-[32px] leading-tight">Open in the time it takes to make tea</h2>
            <ol className="flex flex-col divide-y divide-line border-y border-line">
              {[
                ["Create the account", "Your work email, not a personal one. The domain becomes your subdomain."],
                ["Add your offices", "Pin each one on the map so attendance knows where it is."],
                ["Bring the students in", "Add them, or send us your sheet and we will load it."],
              ].map(([title, blurb], i) => (
                <li key={title} className="flex gap-4 py-5">
                  <span className="num text-[13px] font-medium text-brand-600">0{i + 1}</span>
                  <span>
                    <span className="block text-[15px] font-medium text-ink">{title}</span>
                    <span className="mt-1 block text-[13.5px] leading-relaxed text-muted">{blurb}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-10">
            <Link href="/signup" className="inline-flex min-h-[52px] items-center rounded-full bg-ink px-8 text-[15px] font-medium text-white hover:bg-ink-2">
              Create your consultancy account
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ footer */}
      <footer className="relative bg-ink text-white">
        {/* The ridge flipped along the top, at the 18% the brand book gives. */}
        <Ridge flip height={56} opacity={0.18} />
        <div className="mx-auto max-w-[1200px] px-6 pb-14 pt-10">
          <div className="flex flex-wrap items-start justify-between gap-10">
            <div className="max-w-xs">
              <Logo tone="dark" />
              <p className="mt-3 text-[13px] leading-relaxed text-white/60">
                Software for education consultancies. The student calculators are free for anyone.
              </p>
              <p className="mt-4 text-[12.5px] text-white/50">Priced in NPR · USD · GBP · AUD · CAD · EUR</p>
            </div>
            <div className="flex flex-wrap gap-x-12 gap-y-6 text-[13px]">
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">Product</span>
                {[["Product", "#product"], ["For students", "#students"], ["Security", "#security"], ["Pricing", "#pricing"]].map(([l, h]) => (
                  <Link key={h} href={h} className="inline-flex min-h-[32px] items-center text-white/75 hover:text-white">{l}</Link>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">Account</span>
                <Link href="/signup" className="inline-flex min-h-[32px] items-center text-white/75 hover:text-white">Start free</Link>
                <Link href="/login" className="inline-flex min-h-[32px] items-center text-white/75 hover:text-white">Log in</Link>
                <Link href="/tools" className="inline-flex min-h-[32px] items-center text-white/75 hover:text-white">Free tools</Link>
              </div>
              {/* A consultancy handing us their students' passports reads these
                  before they sign up, not after. */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">Legal</span>
                <Link href="/privacy" className="inline-flex min-h-[32px] items-center text-white/75 hover:text-white">Privacy</Link>
                <Link href="/terms" className="inline-flex min-h-[32px] items-center text-white/75 hover:text-white">Terms</Link>
              </div>
            </div>
          </div>
          <p className="mt-10 border-t border-white/15 pt-6 text-[12px] text-white/45">© {new Date().getFullYear()} {BRAND.name}</p>
        </div>
      </footer>
    </main>
  );
}
