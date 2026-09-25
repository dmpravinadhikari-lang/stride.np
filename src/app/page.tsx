import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Icon, type IconName } from "@/components/Icon";
import { currentUser } from "@/lib/auth/current";
import { BRAND } from "@/lib/brand";
import { GoogleAnalytics } from "@/lib/analytics/ga";
import { PLANS } from "@/lib/plans";
import { STUDENT_JOURNEY, perStudent, studentsCovered } from "@/lib/credits-explained";
import { PricingCards } from "./pricing-cards";

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

const CAPABILITIES: Array<{ group: string; items: Array<{ name: string; blurb: string }> }> = [
  {
    group: "The students",
    items: [
      { name: "Pipeline", blurb: "Enquiry to departure, the counsellor, the next step and whether it is late." },
      { name: "Document vault", blurb: "What is verified, what was sent back and why. Sensitive papers expire on their own." },
      { name: "Applications", blurb: "Which institution, which intake, what it is worth and what is owed on it." },
      { name: "Parent access", blurb: "A read-only view for whoever is paying, without handing over the file." },
    ],
  },
  {
    group: "The office",
    items: [
      { name: "Attendance", blurb: "Clock-in inside a radius you set per office. Away days carry a reason." },
      { name: "Tasks and desks", blurb: "Work goes to a person or a desk, so it survives somebody being on leave." },
      { name: "Payroll", blurb: "Runs keyed to the Nepali month, reading days actually clocked. SSF, PF, TDS, CIT." },
      { name: "Staff records", blurb: "Positions, joining dates, prior experience. Pay as a band, never a figure." },
    ],
  },
  {
    group: "The decisions",
    items: [
      { name: "Office comparison", blurb: "Every branch side by side, each number a link into that office's list." },
      { name: "Channel conversion", blurb: "Which source produces students rather than phone numbers." },
      { name: "Stalled files", blurb: "Time in the current stage against the limit you set for that stage." },
      { name: "Market research", blurb: "Search demand, dated rule changes, and the intake calendar." },
    ],
  },
];

const FOR_STUDENTS: Array<{ icon: IconName; name: string; blurb: string; href: string }> = [
  { icon: "file", name: "IELTS and PTE mocks", blurb: "Full papers under time, marked with a band and the reason for it.", href: "/tools" },
  { icon: "mic", name: "AI visa interview", blurb: "A rehearsal that has read the file and presses when an answer is vague.", href: "/tools" },
  { icon: "pen", name: "SOP studio", blurb: "Draft and score a statement against what a visa officer looks for.", href: "/tools" },
  { icon: "checklist", name: "Eligibility check", blurb: "Whether this student qualifies to get in, and to get the visa.", href: "/tools/eligibility" },
  { icon: "calculator", name: "True cost, any currency", blurb: "Tuition, living, visa and flights, with the bank balance required.", href: "/tools/cost" },
  { icon: "bank", name: "Education loan EMI", blurb: "What the loan really costs, including interest during study.", href: "/tools/loan" },
  { icon: "cap", name: "University finder", blurb: "Who takes these grades, at this budget, for this intake.", href: "/tools/universities" },
  { icon: "file", name: "CV maker", blurb: "Laid out the way admissions offices abroad expect to read it.", href: "/tools" },
];

const SECURITY = [
  { name: "One consultancy cannot see another", blurb: "Every query is filtered by consultancy before it runs. Not a setting anyone can switch off." },
  { name: "A branch sees its own office", blurb: "Changing the address bar does not widen what a counsellor reaches. We test that it does not." },
  { name: "Salaries are not in the CRM", blurb: "The staff list shows a pay band. Figures live in payroll, behind the owner's permission." },
  { name: "Everything is written down", blurb: "Who moved a stage, verified a paper or took a student, with a name and a time." },
  { name: "Sensitive papers expire", blurb: "Bank statements and income papers delete themselves after the intake unless kept." },
  { name: "Your data leaves when you do", blurb: "Ask and you get an export of your own records. No lock-in through the back door." },
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
      <section className="relative overflow-hidden bg-ink text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(1100px circle at 8% -20%, rgba(26,115,232,.55) 0%, transparent 58%), radial-gradient(800px circle at 78% -10%, rgba(251,188,4,.18) 0%, transparent 55%)",
          }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[.16] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />

        <header className="relative z-20">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <Logo tone="light" />
            <nav className="flex items-center gap-1">
              {[["Product", "#product"], ["For students", "#students"], ["Security", "#security"], ["Pricing", "#pricing"]].map(([label, href]) => (
                <Link key={href} href={href} className="hidden rounded-full px-3 py-2 text-[13.5px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white md:block">
                  {label}
                </Link>
              ))}
              {user ? (
                <Link href="/app" className="ml-2 inline-flex min-h-[38px] items-center rounded-full bg-white px-5 text-[13.5px] font-medium text-ink hover:bg-white/90">
                  Open my dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" className="rounded-full px-3 py-2 text-[13.5px] font-medium text-white/70 hover:text-white">Log in</Link>
                  <Link href="/signup" className="ml-1 inline-flex min-h-[38px] items-center rounded-full bg-white px-5 text-[13.5px] font-medium text-ink hover:bg-white/90">
                    Start free
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-14 lg:grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)] lg:pb-28 lg:pt-20">
          <div>
            <h1 className="display text-[44px] leading-[1.04] tracking-[-.02em] sm:text-[60px]">
              Run every office
              <span className="block text-white/55">from one screen</span>
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-white/70">
              The system education consultancies run on: students, attendance, documents, payroll
              and market research, across every branch you have.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="inline-flex min-h-[50px] items-center rounded-full bg-white px-7 text-[15px] font-medium text-ink transition-colors hover:bg-white/90">
                Start free
              </Link>
              <Link href="#product" className="inline-flex min-h-[50px] items-center gap-2 rounded-full border border-white/25 px-6 text-[15px] font-medium text-white transition-colors hover:bg-white/10">
                See the product <Icon name="arrow" size={16} />
              </Link>
            </div>

            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-white/15 pt-6">
              {[["8", "destinations covered"], ["6", "currencies"], ["2", "calendars, BS and AD"]].map(([n, label]) => (
                <div key={label}>
                  <dt className="num text-[26px] font-medium leading-none">{n}</dt>
                  <dd className="mt-1.5 text-[12.5px] leading-snug text-white/55">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative lg:-mr-32 xl:-mr-44">
            <div className="hidden lg:absolute lg:-left-20 lg:top-28 lg:block lg:w-[58%] lg:-rotate-[4deg]">
              <Shot src="/product/market.png" alt="Market research inside the product" />
            </div>
            <div className="relative lg:ml-28">
              <Shot src="/product/console.png" alt="The console showing today's work across a consultancy" priority />
            </div>
          </div>
        </div>

        <div className="relative z-10 border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 text-[12.5px] text-white/45">
            <span className="font-medium text-white/70">Built for students going to</span>
            {DESTINATIONS.map((d) => <span key={d}>{d}</span>)}
          </div>
        </div>
      </section>

      {/* ====================================================== capabilities */}
      <section id="product" className="border-b border-line bg-canvas">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
            <div className="lg:sticky lg:top-20 lg:self-start">
              <h2 className="display text-[32px] leading-tight">Everything the office does</h2>
              <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-2">
                Not a general CRM with an education skin on it. Each part was built for a specific
                hour of a consultancy&rsquo;s week.
              </p>
            </div>

            <div className="flex flex-col gap-10">
              {CAPABILITIES.map((block) => (
                <div key={block.group}>
                  <h3 className="text-[12px] font-medium uppercase tracking-[0.12em] text-brand-600">{block.group}</h3>
                  <dl className="mt-4 divide-y divide-line border-y border-line">
                    {block.items.map((item) => (
                      <div key={item.name} className="grid gap-1 py-4 sm:grid-cols-[180px_1fr] sm:gap-6">
                        <dt className="text-[15px] font-medium text-ink">{item.name}</dt>
                        <dd className="text-[14px] leading-relaxed text-muted">{item.blurb}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================= three screens */}
      <section className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-6xl flex-col gap-20 px-5 py-20">
          {[
            {
              eyebrow: "The board",
              title: "Every student, every office, one row each",
              blurb: "Filter to one office, to files nobody owns, or to follow-ups past their date, then hand a whole list to a counsellor in one press.",
              shot: "/product/students.png",
              alt: "The student board filtered to one office",
              points: ["A colour per stage, the same everywhere", "Search by name, email or phone", "Head office sees every branch at once"],
            },
            {
              eyebrow: "Monday morning",
              title: "Reports an owner can act on",
              blurb: "Which office is behind, which channel actually converts, which files have stopped moving. Every number opens the list behind it.",
              shot: "/product/reports.png",
              alt: "Reports showing office comparison and stalled files",
              points: ["Office by office, side by side", "Conversion with the count behind the rate", "Files past the limit you set for that stage"],
            },
            {
              eyebrow: "Outside your office",
              title: "The market, beside your own numbers",
              blurb: "What students are searching for, rule changes with the date they bite and what each means for your advice, and the intake calendar.",
              shot: "/product/market.png",
              alt: "The market page showing search demand and rule changes",
              points: ["Demand by destination", "Rule changes dated, with the source linked", "Intakes by the date a file must be in"],
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
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(800px circle at 80% 15%, rgba(26,115,232,.45) 0%, transparent 55%)" }} />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[.16] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 lg:grid-cols-[1fr_.8fr]">
          <div>
            <div className="text-[12px] font-medium uppercase tracking-[0.12em] text-brand-300">Branches</div>
            <h2 className="display mt-3 text-[34px] leading-tight">Each office runs itself. You see all of them.</h2>
            <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-white/70">
              A counsellor sees their own office. Head office sees every one, compares them side by
              side and opens any number to the list behind it. Attendance is pinned to each office
              on the map, so clocking in means being there.
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
              <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
                The practice half of the product. Your counsellor reviews the output, the machine
                does the slow part, and the calculators are free for anyone to use across the desk.
              </p>
            </div>
            <Link href="/tools" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line-2 bg-panel px-5 text-[14px] font-medium text-ink hover:border-brand-400 hover:text-brand-600">
              Try the free tools <Icon name="arrow" size={16} />
            </Link>
          </div>

          <div className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {FOR_STUDENTS.map((f) => (
              <Link key={f.name} href={f.href} className="group border-t-2 border-line pt-4 transition-colors hover:border-brand-500">
                <Icon name={f.icon} size={20} className="text-brand-600" />
                <h3 className="h-tight mt-3 text-[15.5px] text-ink group-hover:text-brand-600">{f.name}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{f.blurb}</p>
              </Link>
            ))}
          </div>

          <p className="mt-8 text-[13.5px] text-muted">
            Paid work runs on AI credits, included monthly with every plan. The calculators cost
            nothing to run, so they stay free whether you are a customer or not.
          </p>
        </div>
      </section>

      {/* ========================================================== security */}
      <section id="security" className="border-b border-line bg-panel">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
            <div className="lg:sticky lg:top-20 lg:self-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-100 px-3.5 py-1.5 text-[12.5px] font-medium text-teal-700">
                <Icon name="lock" size={14} /> Data security
              </div>
              <h2 className="display mt-4 text-[32px] leading-tight">You hold passports and bank statements</h2>
              <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-2">
                Hundreds of families trust your office with documents they would not put on a
                photocopier. These are rules the software enforces, not promises in a policy page.
              </p>
            </div>
            <dl className="divide-y divide-line border-y border-line">
              {SECURITY.map((s) => (
                <div key={s.name} className="grid gap-1 py-4 sm:grid-cols-[240px_1fr] sm:gap-6">
                  <dt className="text-[15px] font-medium text-ink">{s.name}</dt>
                  <dd className="text-[14px] leading-relaxed text-muted">{s.blurb}</dd>
                </div>
              ))}
            </dl>
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
              <dl className="mt-5 flex flex-col divide-y divide-line">
                {FAQ.map((q) => (
                  <div key={q.q} className="py-3.5 first:pt-0 last:pb-0">
                    <dt className="text-[14px] font-medium text-ink">{q.q}</dt>
                    <dd className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{q.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================= start */}
      <section className="border-b border-line bg-panel">
        <div className="mx-auto max-w-5xl px-5 py-20">
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
      <footer className="bg-canvas">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="flex flex-wrap items-start justify-between gap-10">
            <div className="max-w-xs">
              <Logo />
              <p className="mt-3 text-[13px] leading-relaxed text-muted">
                Software for education consultancies. The student calculators are free for anyone.
              </p>
              <p className="mt-4 text-[12.5px] text-muted">Priced in NPR · USD · GBP · AUD · CAD · EUR</p>
            </div>
            <div className="flex flex-wrap gap-x-12 gap-y-6 text-[13px]">
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Product</span>
                {[["Product", "#product"], ["For students", "#students"], ["Security", "#security"], ["Pricing", "#pricing"]].map(([l, h]) => (
                  <Link key={h} href={h} className="inline-flex min-h-[32px] items-center text-ink-2 hover:text-brand-600">{l}</Link>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Account</span>
                <Link href="/signup" className="inline-flex min-h-[32px] items-center text-ink-2 hover:text-brand-600">Start free</Link>
                <Link href="/login" className="inline-flex min-h-[32px] items-center text-ink-2 hover:text-brand-600">Log in</Link>
                <Link href="/tools" className="inline-flex min-h-[32px] items-center text-ink-2 hover:text-brand-600">Free tools</Link>
              </div>
            </div>
          </div>
          <p className="mt-10 border-t border-line pt-6 text-[12px] text-muted">© {new Date().getFullYear()} {BRAND.name}</p>
        </div>
      </footer>
    </main>
  );
}
