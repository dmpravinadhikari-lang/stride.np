import type { ReactNode } from "react";
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
import { Reveal } from "@/components/Reveal";
import { PEAK, type Peak } from "@/components/brand-ui";

/**
 * The homepage, built to the mockup in website/officeyak-homepage.html.
 *
 * That file is the reference and its inline styles are the values, so the
 * shape of this page is not a matter of taste: a Paper hero with the ridge
 * across its foot at full size, one Navy statement, the three peaks, a Mist
 * band of real screens, pricing, a Summit Yellow call to action, and the Navy
 * footer with the ridge flipped along its top.
 *
 * Two things here are not in the mockup and are here on purpose. The primary
 * button says "Start free" rather than "Book a demo", because there is a free
 * tier and a signup form at the end of it and no demo to book; the shape,
 * colour, radius and weight are the mockup's. And the sections after the
 * product band - the student tools, security, the plan comparison - are
 * business the mockup does not cover but a consultancy asks about before it
 * signs. They are written in the same vocabulary, and the heaviest of them
 * are folded rather than printed.
 */

export const metadata = {
  // One address per page, so the same content on www or on a
  // consultancy subdomain does not compete with it in search.
  alternates: { canonical: "/" },
  title: `${BRAND.name}, software for education consultancies`,
  description:
    "One system for every branch: student pipeline, attendance, documents, payroll and market research. Priced in NPR, USD, GBP, AUD, CAD and EUR. Free to start on your own subdomain.",
};

/* -------------------------------------------------------------- the parts */

/** The eyebrow: one shape and one colour, where the page had four. */
function Eyebrow({ children, tag = false }: { children: ReactNode; tag?: boolean }) {
  return (
    <span
      className={`text-[12px] font-medium uppercase tracking-[0.5px] ${
        tag ? "self-start rounded-md bg-tint-orange px-2.5 py-1.5 text-tint-orange-ink" : "text-brand-600"
      }`}
    >
      {children}
    </span>
  );
}

/**
 * A screenshot in the frame the imagery rule gives it: a 16px radius, one
 * hairline of Mist, cropped from the top left, and no drawn browser or
 * handset around it. "No fake device bezels" is in the rule in as many words.
 */
function Shot({
  src, alt, ratio = "16/10", priority = false, className = "",
}: { src: string; alt: string; ratio?: string; priority?: boolean; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-wash bg-panel ${className}`}
      style={{ aspectRatio: ratio }}
    >
      <Image
        src={src} alt={alt} width={1440} height={900} priority={priority}
        className="block h-full w-full object-cover object-left-top"
      />
    </div>
  );
}

/** Primary, secondary, and the Navy button the yellow band takes. */
function Btn({
  href, children, tone = "primary", className = "",
}: { href: string; children: ReactNode; tone?: "primary" | "secondary" | "ink"; className?: string }) {
  const skin = {
    // Yak Orange with Ink on it, at 6.79:1. White on this orange measures
    // 2.61:1 and the palette allows it only at 24px and up, which a 16px
    // button label is not; the same measurement is why the rail's active pill
    // is Ink on orange. Two different oranges for the same job would be worse
    // than one documented departure.
    primary: "bg-brand-500 text-ink hover:bg-brand-400",
    secondary: "border border-line-2 bg-panel text-ink hover:border-brand-400 hover:text-brand-600",
    ink: "bg-ink text-white hover:bg-ink-2",
  }[tone];
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[50px] items-center justify-center rounded-[10px] px-[22px] text-[16px] font-semibold transition-colors ${skin} ${className}`}
    >
      {children}
    </Link>
  );
}

/* --------------------------------------------------------------- the data */

/**
 * The three jobs, which is the mockup's organising idea and the best thing in
 * it: every module belongs to one of them, and the peak's colour is how you
 * tell which at a glance. Pink grows the office, orange prepares the student,
 * yellow runs the place.
 */
const PEAKS: Array<{ id: Peak; name: string; blurb: string; pills: string[] }> = [
  {
    id: "grow",
    name: "Grow",
    blurb: "Walk-ins and calls become leads; leads become files on the board. Automatic emails follow up so nobody is forgotten.",
    pills: ["Student leads", "Students board", "Market", "Scholarship finder"],
  },
  {
    id: "prepare",
    name: "Prepare",
    blurb: "Attendance clocked inside the office. IELTS and PTE mocks marked to band tables. An AI interviewer that has read the file. SOPs scored like an assessor.",
    pills: ["Attendance", "Mock tests", "AI interview", "SOP Studio", "Documents"],
  },
  {
    id: "run",
    name: "Run",
    blurb: "Staff, payroll in the Nepali month, offices side by side on Monday morning. Measured automatically so the owner decides from data.",
    pills: ["Staff and teams", "Payroll", "Offices", "Reports"],
  },
];

const FOR_STUDENTS: Array<{ icon: IconName; name: string; blurb: string; href: string }> = [
  { icon: "file", name: "IELTS and PTE mocks", blurb: "Full papers, marked with a band.", href: "/tools" },
  { icon: "mic", name: "AI visa interview", blurb: "Rehearsal that has read the file.", href: "/tools" },
  { icon: "pen", name: "SOP studio", blurb: "Draft, then scored against the real thing.", href: "/tools" },
  { icon: "checklist", name: "Eligibility check", blurb: "In, and through the visa.", href: "/tools/eligibility" },
  { icon: "calculator", name: "True cost, any currency", blurb: "Tuition to flights, plus the bank balance.", href: "/tools/cost" },
  { icon: "bank", name: "Education loan EMI", blurb: "What the loan really costs.", href: "/tools/loan" },
  { icon: "cap", name: "University finder", blurb: "These grades, this budget, this intake.", href: "/tools/universities" },
  { icon: "file", name: "CV maker", blurb: "Laid out the way admissions read it.", href: "/tools" },
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
  { id: "starter", for: "Single branch getting started", lines: ["25 active students, one office", "Board, tasks and documents", "Attendance with a geofence", "Unlimited staff accounts"] },
  { id: "growth", for: "Established consultancy", featured: true, lines: ["100 active students, three offices", "Everything in Starter", "Payroll by the Nepali month", "Market research", "Partners and commission"] },
  { id: "pro", for: "Multi-branch or franchise", lines: ["Unlimited students and offices", "Everything in Growth", "Office comparison for head office", "Priority support"] },
] as const;

const NAV = [["Product", "#product"], ["Modules", "#modules"], ["Pricing", "#pricing"], ["Guides", "/blog"]];

const FOLD = [
  { id: "compare", title: "Every plan, side by side" },
  { id: "credits", title: "What a credit actually buys" },
  { id: "faq", title: "The questions owners ask first" },
] as const;

/* --------------------------------------------------------------- the page */

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

      {/*
        What the company is, in the form a search engine reads.
        Without this, a search for "OfficeYak" returns a page with no idea
        what kind of thing OfficeYak is; with it, the name, the logo and the
        one-line description are available to the result and to every
        assistant that answers questions about software.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `https://${BRAND.domain}/#organization`,
              name: BRAND.name,
              url: `https://${BRAND.domain}`,
              logo: `https://${BRAND.domain}/brand/bell.svg`,
              description: BRAND.oneLiner,
              foundingLocation: { "@type": "Place", name: "Kathmandu, Nepal" },
              areaServed: { "@type": "Country", name: "Nepal" },
            },
            {
              "@type": "WebSite",
              "@id": `https://${BRAND.domain}/#website`,
              url: `https://${BRAND.domain}`,
              name: BRAND.name,
              publisher: { "@id": `https://${BRAND.domain}/#organization` },
            },
            {
              "@type": "SoftwareApplication",
              name: BRAND.name,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description: BRAND.description,
              publisher: { "@id": `https://${BRAND.domain}/#organization` },
              offers: PLAN_ROWS.map((r) => ({
                "@type": "Offer",
                name: PLANS[r.id].label,
                price: PLANS[r.id].priceNpr,
                priceCurrency: "NPR",
                // Stated so the figure is not read as a one-off charge.
                priceSpecification: {
                  "@type": "UnitPriceSpecification",
                  price: PLANS[r.id].priceNpr,
                  priceCurrency: "NPR",
                  billingIncrement: 1,
                  unitCode: "MON",
                },
              })),
            },
          ],
        }) }}
      />

      {/* ============================================================ header */}
      {/* Sticky, Paper at 85% behind a blur, as the reference sets it. */}
      <header className="sticky top-0 z-30 border-b border-wash bg-canvas/85 backdrop-blur-[14px]">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-6 py-4">
          <Logo href="/" size={28} />
          <nav className="hidden items-center gap-7 text-[15px] font-medium text-muted md:flex">
            {NAV.map(([label, href]) => (
              <Link key={href} href={href} className="transition-colors hover:text-ink">{label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Btn href="/app" className="min-h-[44px] text-[15px]">Open my dashboard</Btn>
            ) : (
              <>
                <Link href="/login" className="text-[15px] font-medium text-muted hover:text-ink">Log in</Link>
                {/* The one orange button above the fold. */}
                <Btn href="/signup" className="min-h-[44px] text-[15px]">Start free</Btn>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================== hero */}
      <section className="relative overflow-hidden bg-canvas">
        {/* The text column is given a little more than half, which is what
            lets the headline break where the reference breaks it: "Every
            branch, carried" needs 575px at this size and an even split leaves
            552. Three ragged lines instead of two is a different headline. */}
        <div className="relative z-10 mx-auto grid max-w-[1200px] items-center gap-12 px-6 pb-[200px] pt-16 lg:grid-cols-[1.09fr_1fr]">
          <div className="flex flex-col items-start gap-[22px]">
            <Eyebrow tag>AI-powered consultancy OS</Eyebrow>
            <h1
              className="display text-[clamp(40px,5vw,64px)] leading-[1.02] text-ink"
              style={{ textWrap: "pretty", letterSpacing: "-0.035em" }}
            >
              Every branch, carried like your best branch.
            </h1>
            <p className="max-w-[480px] text-[18px] leading-[1.5] text-ink-2">
              Leads, classes, mock tests, SOPs, HR and payroll ride on one system, and the Yak
              rings when something needs you.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Btn href="/signup">Start free</Btn>
              <Btn href="#product" tone="secondary">See the product</Btn>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
              {/* The separator travels with the item before it, so a wrap
                  never starts a line with a lone dot. */}
              {["Built in Nepal", "Nepali-month payroll", "Works on mobile data"].map((t, i, all) => (
                <span key={t} className="flex items-center gap-x-4">
                  {t}
                  {i < all.length - 1 && <span aria-hidden className="text-line-2">·</span>}
                </span>
              ))}
            </div>
          </div>

          <Shot
            src="/product/students.png" alt="The student board, every office in one list"
            ratio="16/11" priority
            className="shadow-[0_24px_60px_-30px_rgba(21,19,58,0.35)]"
          />
        </div>

        {/* The ridge across the foot of the hero, at full size and full
            colour. It is the page's one large piece of brand, and the
            statement band lands directly underneath it. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0">
          <Ridge height={170} />
        </div>
      </section>

      {/* ========================================================= statement */}
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-[900px] px-6 py-[72px] text-center">
          <p className="display text-[clamp(26px,3vw,38px)] leading-[1.2] tracking-[-0.03em]">
            A consultancy in Kathmandu carries 400 student files, 12 classes, three offices and a
            WhatsApp inbox that never sleeps. Something has to carry it.
          </p>
        </div>
      </section>

      {/* ======================================================= three peaks */}
      <section id="modules" className="bg-canvas">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-6 py-14 md:py-24">
          <div className="flex max-w-[640px] flex-col gap-2.5">
            <Eyebrow>Three peaks, one system</Eyebrow>
            <h2 className="display text-[clamp(30px,3.4vw,42px)] leading-[1.1] tracking-[-0.03em]">
              Grow. Prepare. Run.
            </h2>
            <p className="text-[16px] leading-[1.55] text-ink-2">
              Every module belongs to one of three jobs, and every job talks to the others.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PEAKS.map((p, i) => (
              <Reveal key={p.id} delay={i * 60}>
                <article className="flex h-full flex-col gap-3.5 rounded-2xl border border-line bg-panel p-7">
                  <span className={`grid h-9 w-9 place-items-center rounded-[10px] ${PEAK[p.id].tint}`}>
                    <span aria-hidden className={`h-3 w-3 rotate-45 rounded-[3px] ${PEAK[p.id].square}`} />
                  </span>
                  <h3 className="display text-[22px] leading-none tracking-[-0.03em]">{p.name}</h3>
                  <p className="text-[15px] leading-[1.55] text-ink-2">{p.blurb}</p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-1.5 text-[12px] font-medium">
                    {p.pills.map((pill) => (
                      <span key={pill} className={`rounded-full px-2.5 py-1.5 ${PEAK[p.id].tint} ${PEAK[p.id].ink}`}>
                        {pill}
                      </span>
                    ))}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================== product */}
      <section id="product" className="bg-wash">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-6 py-14 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex max-w-[560px] flex-col gap-2.5">
              <Eyebrow>The product</Eyebrow>
              <h2 className="display text-[clamp(30px,3.4vw,42px)] leading-[1.1] tracking-[-0.03em]">
                Shown, not described.
              </h2>
            </div>
            <Link href="/signup" className="text-[15px] font-semibold text-brand-600 hover:underline">
              See every screen →
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { shot: "/product/attendance.png", alt: "The attendance register for one office", title: "Clock in from the office", line: "Inside a radius you set. Away days carry a reason." },
              { shot: "/product/reports.png", alt: "Reports comparing every office", title: "Five offices, side by side", line: "Every number opens the list behind it." },
            ].map((c) => (
              <div key={c.title} className="flex flex-col gap-3">
                <Shot src={c.shot} alt={c.alt} />
                <div className="text-[17px] font-semibold text-ink">{c.title}</div>
                <div className="text-[14px] leading-[1.5] text-ink-2">{c.line}</div>
              </div>
            ))}

            {/* The Navy card, with the ridge along its foot at full colour.
                One per page, which is why the pricing card uses the bell. */}
            <div className="flex flex-col gap-3">
              <div
                className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-ink p-6 text-white"
                style={{ aspectRatio: "16/10" }}
              >
                <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0">
                  <Ridge height={86} />
                </div>
                <span className="mono relative text-[12px] text-accent-500">YAK SAYS</span>
                <p className="display relative pb-[26%] text-[20px] leading-[1.25] tracking-[-0.02em]">
                  Call Niraj first. Walk-ins convert 2.1 times more often when they are rung
                  within a day.
                </p>
              </div>
              <div className="text-[17px] font-semibold text-ink">The Yak speaks in numbers</div>
              <div className="text-[14px] leading-[1.5] text-ink-2">
                One recommendation per screen, always with the reason behind it.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================== student tools */}
      <section id="students" className="bg-canvas">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-6 py-14 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex max-w-[560px] flex-col gap-2.5">
              <Eyebrow>For your students</Eyebrow>
              <h2 className="display text-[clamp(30px,3.4vw,42px)] leading-[1.1] tracking-[-0.03em]">
                The practice half.
              </h2>
              <p className="text-[16px] leading-[1.55] text-ink-2">
                Your counsellor reviews what the machine writes. The calculators are free for
                anyone, with or without an account.
              </p>
            </div>
            <Link href="/tools" className="text-[15px] font-semibold text-brand-600 hover:underline">
              Try the free tools →
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FOR_STUDENTS.map((f) => (
              <Link
                key={f.name} href={f.href}
                className="group flex flex-col gap-2.5 rounded-2xl border border-line bg-panel p-6 transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-brand-300"
              >
                <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-tint-orange text-tint-orange-ink">
                  <Icon name={f.icon} size={18} />
                </span>
                <h3 className="text-[16px] font-semibold leading-tight text-ink group-hover:text-brand-600">{f.name}</h3>
                <p className="text-[14px] leading-[1.5] text-ink-2">{f.blurb}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================== security */}
      <section id="security" className="bg-wash">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-6 py-14 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
            <div className="flex flex-col gap-2.5 lg:sticky lg:top-28 lg:self-start">
              <Eyebrow>Data security</Eyebrow>
              <h2 className="display text-[clamp(30px,3.4vw,42px)] leading-[1.1] tracking-[-0.03em]">
                You hold passports and bank statements.
              </h2>
              <p className="max-w-sm text-[16px] leading-[1.55] text-ink-2">
                Families hand you papers they would not put on a photocopier. These are rules the
                software enforces, not promises on a page.
              </p>
              <Link href="/privacy" className="mt-2 text-[15px] font-semibold text-brand-600 hover:underline">
                What we do with your data →
              </Link>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {SECURITY.map((s, i) => (
                <Reveal key={s.name} delay={i * 40}>
                  <li className="flex h-full gap-3 rounded-2xl border border-line bg-panel p-5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-tint-navy text-ink">
                      <Icon name={s.icon} size={17} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold leading-snug text-ink">{s.name}</span>
                      <span className="mt-1 block text-[14px] leading-[1.5] text-ink-2">{s.blurb}</span>
                    </span>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* =========================================================== pricing */}
      <section id="pricing" className="bg-canvas">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-6 py-14 md:py-24">
          <div className="flex max-w-[560px] flex-col gap-2.5">
            <Eyebrow>Pricing</Eyebrow>
            <h2 className="display text-[clamp(30px,3.4vw,42px)] leading-[1.1] tracking-[-0.03em]">
              Priced for a Nepali consultancy.
            </h2>
            <p className="text-[16px] leading-[1.55] text-ink-2">
              Start free while you set up. Nothing is charged until you ask to be invoiced, there
              is no card on file, and you move between plans as the office grows.
            </p>
          </div>

          <PricingCards rows={cards} />

          {/*
            The comparison table, the credit arithmetic and the four questions
            owners ask. All true, none of it the thing that decides the sale,
            so it opens on request rather than adding three screens that every
            reader has to scroll past to reach the end of the page.
          */}
          <div className="flex flex-col gap-3">
            {FOLD.map((f) => (
              <details key={f.id} className="group rounded-2xl border border-line bg-panel">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-6 py-4">
                  <Icon name="chevron" size={16} className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
                  <span className="text-[15px] font-semibold text-ink">{f.title}</span>
                </summary>

                {f.id === "compare" && (
                  <div className="scroll-soft overflow-x-auto border-t border-line">
                    <table className="w-full min-w-[640px] text-[13.5px]">
                      <thead>
                        <tr className="border-b border-line bg-wash text-left">
                          <th className="px-5 py-3 text-[12px] font-medium uppercase tracking-[0.5px] text-muted">What you get</th>
                          {PLAN_ROWS.map((r) => (
                            <th key={r.id} className="px-5 py-3 text-[13.5px] font-medium text-ink">{PLANS[r.id].label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {COMPARE.map((row) => (
                          <tr key={row.label} className="border-b border-line last:border-0">
                            <td className="px-5 py-3 text-ink-2">
                              {row.label}
                              {row.note && <span className="mt-0.5 block text-[12px] text-muted">{row.note}</span>}
                            </td>
                            {(["starter", "growth", "pro"] as const).map((id) => {
                              const v = row.value(id);
                              return (
                                <td key={id} className="px-5 py-3">
                                  {v === true
                                    ? <Icon name="check" size={17} className="text-teal-700" label="Included" />
                                    : v === false
                                      ? <span className="text-[13px] text-muted">Not included</span>
                                      : <span className="mono text-ink">{v}</span>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {f.id === "credits" && (
                  <div className="border-t border-line px-6 py-5">
                    <p className="text-[14px] leading-relaxed text-ink-2">
                      Credits are spent on AI work only, and only when somebody presses the button.
                      The board, attendance, documents, payroll and reports cost nothing to use.
                    </p>
                    <ul className="mt-4 divide-y divide-line">
                      {STUDENT_JOURNEY.map((item) => (
                        <li key={item.label} className="flex items-baseline gap-3 py-3">
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] text-ink">{item.label}</span>
                            <span className="block text-[13px] text-muted">{item.detail}</span>
                          </span>
                          <span className="mono shrink-0 text-[14px] font-medium text-ink">{item.credits()}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 border-t border-line pt-4 text-[14px] text-ink-2">
                      One student, prepared end to end:{" "}
                      <span className="mono font-medium text-ink">{perStudent()} credits</span>. Unused
                      credits do not roll over, and running out never locks you out of the office.
                    </p>
                  </div>
                )}

                {f.id === "faq" && (
                  <div className="divide-y divide-line border-t border-line px-6">
                    {FAQ.map((q) => (
                      <div key={q.q} className="py-4">
                        <div className="text-[14.5px] font-medium text-ink">{q.q}</div>
                        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{q.a}</p>
                      </div>
                    ))}
                  </div>
                )}
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* =============================================================== cta */}
      {/* Summit Yellow with Ink on it, which the palette calls good at any
          size, and the Navy button beside it. */}
      <section className="bg-accent-500">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-8 px-6 py-[72px]">
          <h2 className="display max-w-[620px] text-[clamp(28px,3vw,40px)] leading-[1.1] tracking-[-0.03em] text-ink">
            Let the Yak carry the office. You do the counselling.
          </h2>
          <Btn href="/signup" tone="ink" className="shrink-0">Start free in ten minutes</Btn>
        </div>
      </section>

      {/* ============================================================ footer */}
      <footer className="relative overflow-hidden bg-ink text-white">
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
            {[
              { head: "Product", links: [["Student leads", "#modules"], ["Attendance", "#product"], ["Mock tests and AI interview", "#students"], ["SOP Studio", "/tools"], ["HR and payroll", "#modules"]] },
              { head: "Company", links: [["Pricing", "#pricing"], ["Security", "#security"], ["Log in", "/login"], ["Start free", "/signup"]] },
              { head: "Guides", links: [["All guides", "/blog"], ["Free student tools", "/tools"], ["True cost calculator", "/tools/cost"], ["University finder", "/tools/universities"]] },
            ].map((col) => (
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
              <Link href="#security" className="hover:text-white">Security</Link>
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
