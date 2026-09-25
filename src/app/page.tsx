import Image from "next/image";
import Link from "next/link";
import { LinkButton } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { Icon, type IconName } from "@/components/Icon";
import { currentUser } from "@/lib/auth/current";
import { BRAND } from "@/lib/brand";
import { GoogleAnalytics } from "@/lib/analytics/ga";
import { PLANS } from "@/lib/plans";
import { STUDENT_JOURNEY, perStudent, studentsCovered } from "@/lib/credits-explained";

/**
 * The homepage sells to consultancy owners. Nobody else.
 *
 * It is built around screenshots of the real console rather than drawings of
 * one. An owner deciding whether to move five offices onto something wants to
 * see the actual screen their counsellors will sit in front of, and a product
 * that will not show its own interface is usually hiding how thin it is.
 *
 * Depth comes from three things and no more: a dark band that the light
 * sections sit against, screenshots lifted off the page with a ring and a
 * shadow, and one soft colour wash behind the hero. Everything else is flat
 * on purpose.
 */

export const metadata = {
  title: `${BRAND.name}, software for Nepal's education consultancies`,
  description:
    "One system for your branches: student pipeline, attendance with a geofence, tasks, documents, payroll by the Nepali month, and market research. Free to start on your own subdomain.",
};

/** A screenshot, lifted off the page. */
function Shot({
  src, alt, width = 1440, height = 900, className = "", priority = false,
}: { src: string; alt: string; width?: number; height?: number; className?: string; priority?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-line-2 bg-panel shadow-[0_24px_60px_-28px_rgba(32,33,36,.45)] ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-line bg-wash px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-danger-600/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent-500/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-teal-500/60" />
        <span className="ml-2 truncate text-[11.5px] text-muted">yourname.{BRAND.domain}</span>
      </div>
      <Image src={src} alt={alt} width={width} height={height} priority={priority} className="block w-full" />
    </div>
  );
}

const RUNS_THE_OFFICE: Array<{ icon: IconName; name: string; blurb: string }> = [
  { icon: "students", name: "Student pipeline", blurb: "Enquiry to departure, the counsellor, the next step and the date it was due." },
  { icon: "clock", name: "Attendance", blurb: "Staff clock in from inside a radius you set per office. The month totals itself." },
  { icon: "tasks", name: "Tasks and desks", blurb: "Work goes to a person or to a desk, so it survives somebody being on leave." },
  { icon: "folder", name: "Document vault", blurb: "What is verified, what was sent back, and why. Financial papers expire on their own." },
  { icon: "wallet", name: "Payroll", blurb: "Runs keyed to Bhadra, not September, reading the days actually clocked." },
  { icon: "partners", name: "Partners and commission", blurb: "Who you send students to, on what terms, and what is owed." },
  { icon: "chart", name: "Reports that decide", blurb: "Which office is behind, which channel converts, which files stopped moving." },
  { icon: "building", name: "Branches", blurb: "Every office its own register and students. Head office compares them." },
];

/** The student side. Kept, because it is half of what a consultancy sells. */
const FOR_STUDENTS: Array<{ icon: IconName; name: string; blurb: string; href: string }> = [
  { icon: "file", name: "IELTS and PTE mocks", blurb: "Full papers, sat under time, marked with a band and the reason for it.", href: "/tools" },
  { icon: "mic", name: "AI visa interview", blurb: "A rehearsal that has read the file and follows up when an answer is vague.", href: "/tools" },
  { icon: "pen", name: "SOP studio", blurb: "Draft and score a statement against what a visa officer actually looks for.", href: "/tools" },
  { icon: "checklist", name: "Eligibility check", blurb: "Whether this student qualifies to get in, and to get the visa.", href: "/tools/eligibility" },
  { icon: "calculator", name: "True cost in NPR", blurb: "Tuition, living, visa and flights, in rupees, with the bank balance needed.", href: "/tools/cost" },
  { icon: "bank", name: "Education loan EMI", blurb: "What a Nepali education loan really costs, including interest during study.", href: "/tools/loan" },
  { icon: "cap", name: "University finder", blurb: "Who takes these grades, at this budget, for this intake.", href: "/tools/universities" },
  { icon: "file", name: "CV maker", blurb: "Laid out the way admissions offices abroad expect to read it.", href: "/tools" },
];

const SECURITY = [
  { name: "One consultancy cannot see another", blurb: "Every query is filtered by consultancy before it runs. Not a setting anyone can switch off." },
  { name: "A branch sees its own office", blurb: "Changing the address bar does not widen what a counsellor can reach. We test that it does not." },
  { name: "Salaries are not in the CRM", blurb: "The staff list shows a pay band. The figures live in payroll, behind the owner's permission." },
  { name: "Everything is written down", blurb: "Who moved a stage, verified a paper, took a student, with a name and a time on it." },
  { name: "Sensitive papers expire", blurb: "Bank statements and income papers delete themselves after the intake unless kept on purpose." },
  { name: "Your data leaves when you do", blurb: "Ask and you get an export of your own records. No lock-in through the back door." },
];

const cap = (n: number) => (n === Number.POSITIVE_INFINITY ? "Unlimited" : String(n));

/** The rows that actually differ between plans. Anything every plan has is
 *  left out: a comparison table of ticks all the way down tells nobody
 *  anything. */
const COMPARE: Array<{ label: string; note?: string; value: (id: "starter" | "growth" | "pro") => string | boolean }> = [
  { label: "Active students", note: "Departed and lost files do not count", value: (id) => cap(PLANS[id].maxStudents) },
  { label: "Offices", value: (id) => cap(PLANS[id].maxBranches) },
  { label: "AI credits a month", value: (id) => PLANS[id].monthlyCredits.toLocaleString("en-IN") },
  { label: "Staff accounts", note: "Counsellors, admins, everyone", value: () => "Unlimited" },
  { label: "Student board, tasks, documents", value: () => true },
  { label: "Attendance with a geofence", value: () => true },
  { label: "Payroll by the Nepali month", value: (id) => id !== "starter" },
  { label: "Market research", value: (id) => id !== "starter" },
  { label: "Partners and commission", value: (id) => id !== "starter" },
  // True where it is true: the comparison appears once there is more than one
  // office to compare, which Starter cannot have.
  { label: "Head office comparison", note: "Office by office, side by side", value: (id) => PLANS[id].maxBranches > 1 },
  { label: "Export of your own data", note: "Ask us and we send it", value: () => true },
];

const FAQ = [
  {
    q: "What happens when we pass the student limit?",
    a: "Nothing breaks and nothing is deleted. Adding the next student asks you to move up a plan. Moving a departed student on frees a place, because only active files count.",
  },
  {
    q: "Do we pay per counsellor?",
    a: "No. Staff accounts are unlimited on every plan. You are paying for the office, not for seats, because charging per seat makes an owner ration logins.",
  },
  {
    q: "What if we run out of credits?",
    a: "The AI tools pause until the first of the month. Everything else keeps working: the board, attendance, documents, payroll and reports do not use credits.",
  },
  {
    q: "Can we try it with real students first?",
    a: "That is the intended way. Set up, bring your students in, and use it free while you decide. We invoice when you tell us to.",
  },
];

const PLAN_ROWS = [
  { id: "starter" as const, for: "One office finding its feet", lines: ["25 active students, one office", "Board, tasks, documents", "Attendance with a geofence", "Unlimited staff accounts"] },
  { id: "growth" as const, for: "An established consultancy", featured: true, lines: ["100 active students, three offices", "Everything in Starter", "Payroll by the Nepali month", "Market research", "Partners and commission"] },
  { id: "pro" as const, for: "Multi-branch or franchise", lines: ["Unlimited students and offices", "Everything in Growth", "Head office comparison across offices", "Priority support"] },
];

export default async function Home() {
  const user = await currentUser();

  return (
    <main className="bg-canvas">
      <GoogleAnalytics />

      {/* ---------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Logo />
          <nav className="flex items-center gap-1">
            {[["Product", "#product"], ["For students", "#students"], ["Security", "#security"], ["Pricing", "#pricing"]].map(([label, href]) => (
              <Link key={href} href={href} className="hidden rounded-full px-3 py-2 text-[13.5px] font-medium text-ink-2 hover:bg-wash hover:text-ink md:block">
                {label}
              </Link>
            ))}
            {user ? (
              <LinkButton href="/app" size="sm">Open my dashboard</LinkButton>
            ) : (
              <>
                <Link href="/login" className="rounded-full px-3 py-2 text-[13.5px] font-medium text-ink-2 hover:text-brand-600">Log in</Link>
                <LinkButton href="/signup" size="sm">Start free</LinkButton>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* -------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-line">
        {/* one soft wash, drawn behind everything, no gradient on the type */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(900px circle at 15% -10%, #D2E3FC 0%, transparent 55%), radial-gradient(760px circle at 92% 0%, #FEEFC3 0%, transparent 50%), linear-gradient(180deg, #FFFFFF 0%, #F8FAFD 100%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 pb-0 pt-16 text-center sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-panel px-3.5 py-1.5 text-[12.5px] font-medium text-ink-2">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            Built in Kathmandu, for consultancies here
          </span>
          <h1 className="display mx-auto mt-5 max-w-3xl text-[40px] leading-[1.06] sm:text-[58px]">
            Run every branch from one screen
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-2">
            Students, attendance, documents, payroll and market research in one system, built for
            how education consultancies in Nepal actually work.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <LinkButton href="/signup" size="lg">Start free on your own subdomain</LinkButton>
            <Link href="#product" className="inline-flex min-h-[48px] items-center gap-1.5 rounded-full border border-line-2 bg-panel px-5 text-[15px] font-medium text-ink hover:border-brand-400 hover:text-brand-600">
              See the product <Icon name="arrow" size={16} />
            </Link>
          </div>
          <p className="mt-4 text-[13.5px] text-muted">
            No card, no sales call. Your office lives at <span className="font-medium text-ink">yourname.{BRAND.domain}</span>.
          </p>

          <div className="mx-auto mt-14 max-w-5xl px-1 pb-16">
            <Shot src="/product/console.png" alt="The STRIDE console showing today's work for a consultancy" priority />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- what it runs */}
      <section id="product" className="border-b border-line bg-panel">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <h2 className="display text-[30px]">Everything the office does, in one place</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">
            Not a CRM with an education skin. Each part was built for a specific hour of a
            consultancy's week.
          </p>
          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {RUNS_THE_OFFICE.map((f) => (
              <div key={f.name} className="rounded-2xl border border-line bg-canvas p-5 transition-colors hover:border-brand-400">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-brand-600">
                  <Icon name={f.icon} size={20} />
                </span>
                <h3 className="h-tight mt-3.5 text-[15.5px] text-ink">{f.name}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{f.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------- three screens, in detail */}
      <section className="border-b border-line bg-canvas">
        <div className="mx-auto flex max-w-6xl flex-col gap-16 px-5 py-16 sm:py-20">
          {[
            {
              eyebrow: "The board",
              title: "Every student, every office, one row each",
              blurb:
                "Where they are, who has them, what is next and whether it is late. Filter to one office, to files nobody owns, or to follow-ups past their date, then hand a whole list to a counsellor in one press.",
              shot: "/product/students.png",
              alt: "The student board filtered to one office",
              points: ["Colour per stage, the same colour everywhere", "Search by name, email or phone", "Head office sees all five offices at once"],
            },
            {
              eyebrow: "The morning after",
              title: "Reports an owner can act on",
              blurb:
                "Which office is behind, which channel actually converts, which files have stopped moving. Every number opens the list behind it, so a figure is never the end of the road.",
              shot: "/product/reports.png",
              alt: "Reports showing office comparison and stalled files",
              points: ["Office by office, side by side", "Channel conversion, with the count behind the rate", "Files sitting longer in a stage than your own limit"],
            },
            {
              eyebrow: "Outside your office",
              title: "What the market is doing, beside your own numbers",
              blurb:
                "What Nepal is searching for and which way it is moving, rule changes with the date they bite and what each means for your advice, and the intake calendar by the date a file has to be in.",
              shot: "/product/market.png",
              alt: "The market page showing search demand and rule changes",
              points: ["Demand by destination", "Rule changes dated, with the source linked", "Intakes closing next"],
            },
          ].map((row, i) => (
            <div key={row.title} className={`grid items-center gap-10 lg:grid-cols-2 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <div>
                <div className="text-[12px] font-medium uppercase tracking-[0.1em] text-brand-600">{row.eyebrow}</div>
                <h3 className="display mt-2 text-[27px] leading-tight">{row.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{row.blurb}</p>
                <ul className="mt-5 flex flex-col gap-2">
                  {row.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-[14px] text-ink-2">
                      <Icon name="check" size={17} className="mt-0.5 text-teal-700" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <Shot src={row.shot} alt={row.alt} />
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ dark band: branches */}
      <section className="relative overflow-hidden border-b border-line bg-brand-900">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{ background: "radial-gradient(700px circle at 85% 10%, rgba(26,115,232,.55) 0%, transparent 55%), radial-gradient(600px circle at 5% 90%, rgba(251,188,4,.28) 0%, transparent 55%)" }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:py-20 lg:grid-cols-[1fr_.85fr]">
          <div>
            <div className="text-[12px] font-medium uppercase tracking-[0.1em] text-brand-300">Five offices, one company</div>
            <h2 className="display mt-2 text-[32px] leading-tight text-white">
              Each branch runs itself. You see all of them.
            </h2>
            <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-white/75">
              A counsellor in Pokhara sees Pokhara. Head office sees every office, compares them
              side by side, and opens any number to the list behind it. Attendance is pinned to
              each office on the map, so clocking in means being there.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ["clock", "Clock-in inside a radius you set"],
                ["building", "Per-office students and register"],
                ["chart", "Head office comparison"],
                ["wallet", "Payroll per office, Nepali month"],
              ].map(([icon, label]) => (
                <li key={label} className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-[13.5px] text-white">
                  <Icon name={icon as IconName} size={17} className="text-brand-300" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <div className="mx-auto w-full max-w-[300px]">
            <div className="overflow-hidden rounded-[28px] border-[6px] border-ink/80 bg-panel shadow-[0_30px_70px_-30px_rgba(0,0,0,.8)]">
              <Image src="/product/phone.png" alt="STRIDE on a phone, showing today's work" width={390} height={780} className="block w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- for the students */}
      <section id="students" className="border-b border-line bg-panel">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="display text-[30px]">What your students get</h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">
                The practice half of the product. Your counsellor reviews the output, the machine
                does the slow part, and the calculators are free for anyone to use across the desk.
              </p>
            </div>
            <Link href="/tools" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-line-2 bg-panel px-5 text-[14px] font-medium text-ink hover:border-brand-400 hover:text-brand-600">
              Try the free tools <Icon name="arrow" size={16} />
            </Link>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FOR_STUDENTS.map((f) => (
              <Link key={f.name} href={f.href} className="group rounded-2xl border border-line bg-canvas p-5 transition-colors hover:border-brand-400">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-50 text-accent-600">
                  <Icon name={f.icon} size={20} />
                </span>
                <h3 className="h-tight mt-3.5 text-[15.5px] text-ink group-hover:text-brand-600">{f.name}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{f.blurb}</p>
              </Link>
            ))}
          </div>

          <p className="mt-6 text-[13.5px] text-muted">
            Paid work runs on AI credits, included monthly with every plan. The calculators cost
            nothing to run, so they stay free whether you are a customer or not.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------- security */}
      <section id="security" className="border-b border-line bg-canvas">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-100 px-3.5 py-1.5 text-[12.5px] font-medium text-teal-700">
              <Icon name="lock" size={14} /> Data security
            </div>
            <h2 className="display mt-4 text-[30px]">You hold passports and bank statements</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
              Hundreds of families trust your office with documents they would not put on a
              photocopier. These are rules the software enforces, not promises in a policy page.
            </p>
          </div>
          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SECURITY.map((s) => (
              <div key={s.name} className="rounded-2xl border border-line bg-panel p-5">
                <h3 className="h-tight text-[15px] text-ink">{s.name}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{s.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- pricing */}
      <section id="pricing" className="border-b border-line bg-panel">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <h2 className="display text-[30px]">Three plans, in rupees</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">
            Start free while you set up. Nothing is charged until you ask to be invoiced, there is
            no card on file, and you can move between plans whenever the office grows.
          </p>

          <div className="mt-9 grid gap-4 lg:grid-cols-3">
            {PLAN_ROWS.map((row) => {
              const plan = PLANS[row.id];
              const students = studentsCovered(plan.monthlyCredits);
              return (
                <div
                  key={row.id}
                  className={`relative flex flex-col rounded-2xl border p-6 ${
                    row.featured
                      ? "border-brand-500 bg-canvas shadow-[0_20px_50px_-30px_rgba(26,115,232,.6)]"
                      : "border-line bg-panel"}`}
                >
                  {row.featured && (
                    <span className="absolute -top-3 left-6 rounded-full bg-brand-500 px-3 py-1 text-[11.5px] font-medium text-white">
                      Most offices
                    </span>
                  )}
                  <h3 className="h-tight text-[19px] text-ink">{plan.label}</h3>
                  <p className="mt-1 text-[13.5px] text-muted">{row.for}</p>

                  <div className="mt-5 flex items-baseline gap-1.5">
                    <span className="num text-[34px] font-medium leading-none text-ink">
                      {plan.priceNpr.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[13.5px] text-muted">NPR / month</span>
                  </div>
                  <p className="mt-1.5 text-[12.5px] text-muted">
                    The whole office, not per counsellor.
                  </p>

                  <div className="mt-4 rounded-xl border border-line bg-wash px-3.5 py-3">
                    <div className="text-[13px] font-medium text-ink">
                      {plan.monthlyCredits.toLocaleString("en-IN")} AI credits a month
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-muted">
                      About {students} student{students === 1 ? "" : "s"} prepared end to end
                    </div>
                  </div>

                  <ul className="mt-5 flex flex-1 flex-col gap-2">
                    {row.lines.map((l) => (
                      <li key={l} className="flex items-start gap-2 text-[13.5px] text-ink-2">
                        <Icon name="check" size={16} className="mt-0.5 text-teal-700" />
                        {l}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    <LinkButton href="/signup" variant={row.featured ? "primary" : "secondary"}>Start free</LinkButton>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ------------------------------------------------ what differs */}
          <div className="mt-10 overflow-hidden rounded-2xl border border-line">
            <div className="scroll-soft overflow-x-auto">
              <table className="w-full min-w-[640px] text-[13.5px]">
                <thead>
                  <tr className="border-b border-line bg-wash text-left">
                    <th className="px-4 py-3 text-[12px] font-medium uppercase tracking-[0.08em] text-muted">What you get</th>
                    {PLAN_ROWS.map((r) => (
                      <th key={r.id} className={`px-4 py-3 text-[13.5px] font-medium ${r.featured ? "text-brand-700" : "text-ink"}`}>
                        {PLANS[r.id].label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((row) => (
                    <tr key={row.label} className="border-b border-line last:border-0">
                      <td className="px-4 py-2.5 text-ink-2">
                        {row.label}
                        {row.note && <span className="mt-0.5 block text-[12px] text-muted">{row.note}</span>}
                      </td>
                      {(["starter", "growth", "pro"] as const).map((id) => {
                        const v = row.value(id);
                        return (
                          <td key={id} className="px-4 py-2.5">
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

          {/* ------------------------------------------- what a credit buys */}
          <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-line bg-canvas p-6">
              <h3 className="h-tight text-[17px]">What a credit actually buys</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                Credits are only spent on AI work, and only when somebody presses the button. The
                board, attendance, documents, payroll and reports cost nothing to use.
              </p>
              <ul className="mt-4 divide-y divide-line">
                {STUDENT_JOURNEY.map((item) => (
                  <li key={item.label} className="flex items-baseline gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] text-ink">{item.label}</span>
                      <span className="block text-[12.5px] text-muted">{item.detail}</span>
                    </span>
                    <span className="num shrink-0 text-[13.5px] font-medium text-ink">{item.credits()}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-line pt-3 text-[13px] text-ink-2">
                One student, prepared end to end: <span className="num font-medium text-ink">{perStudent()} credits</span>.
                Unused credits do not roll over, and running out never locks you out of the office.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-canvas p-6">
              <h3 className="h-tight text-[17px]">The questions owners ask first</h3>
              <dl className="mt-4 flex flex-col divide-y divide-line">
                {FAQ.map((q) => (
                  <div key={q.q} className="py-3 first:pt-0 last:pb-0">
                    <dt className="text-[14px] font-medium text-ink">{q.q}</dt>
                    <dd className="mt-1 text-[13.5px] leading-relaxed text-muted">{q.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- how to start */}
      <section className="border-b border-line bg-canvas">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:py-20">
          <h2 className="display text-[30px]">Open in the time it takes to make tea</h2>
          <ol className="mx-auto mt-9 grid max-w-3xl gap-4 text-left sm:grid-cols-3">
            {[
              ["Create the account", "Your work email, not a personal one. The domain becomes your subdomain."],
              ["Add your offices", "Pin each one on the map so attendance knows where it is."],
              ["Bring the students in", "Add them, or send us your sheet and we will load it."],
            ].map(([title, blurb], i) => (
              <li key={title} className="rounded-2xl border border-line bg-panel p-5">
                <span className="num grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-[14px] font-medium text-white">{i + 1}</span>
                <h3 className="h-tight mt-3 text-[15px] text-ink">{title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{blurb}</p>
              </li>
            ))}
          </ol>
          <div className="mt-9">
            <LinkButton href="/signup" size="lg">Create your consultancy account</LinkButton>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ footer */}
      <footer className="bg-panel">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div className="max-w-xs">
              <Logo />
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                Software for Nepal&rsquo;s education consultancies. The calculators are free for anyone.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-10 gap-y-4 text-[13px]">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Product</span>
                {[["Product", "#product"], ["For students", "#students"], ["Security", "#security"], ["Pricing", "#pricing"]].map(([l, h]) => (
                  <Link key={h} href={h} className="inline-flex min-h-[36px] items-center text-ink-2 hover:text-brand-600">{l}</Link>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Account</span>
                <Link href="/signup" className="inline-flex min-h-[36px] items-center text-ink-2 hover:text-brand-600">Start free</Link>
                <Link href="/login" className="inline-flex min-h-[36px] items-center text-ink-2 hover:text-brand-600">Log in</Link>
                <Link href="/tools" className="inline-flex min-h-[36px] items-center text-ink-2 hover:text-brand-600">Free tools</Link>
              </div>
            </div>
          </div>
          <p className="mt-8 border-t border-line pt-6 text-[12px] text-muted">
            © {new Date().getFullYear()} {BRAND.name} · Made in Kathmandu
          </p>
        </div>
      </footer>
    </main>
  );
}
