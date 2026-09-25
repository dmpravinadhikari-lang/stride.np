import Link from "next/link";
import { LinkButton } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { Icon, type IconName } from "@/components/Icon";
import { currentUser } from "@/lib/auth/current";
import { BRAND } from "@/lib/brand";
import { GoogleAnalytics } from "@/lib/analytics/ga";
import { PLANS } from "@/lib/plans";

/**
 * The homepage sells to consultancy owners. Nobody else.
 *
 * A student who is already with a consultancy arrives at /login, and a
 * student shopping for a consultancy is not the buyer, so neither is
 * advertised to here. What is left is the four questions an owner asks in the
 * first thirty seconds: what is it, what does it do, is my data safe, what
 * does it cost.
 *
 * One idea per block. Anything that only restated its own heading was cut
 * rather than shortened.
 */

export const metadata = {
  title: `${BRAND.name}, software for Nepal's education consultancies`,
  description:
    "One system for your branches: student pipeline, attendance with a geofence, tasks, documents, payroll by the Nepali month, and market research. Free to start on your own subdomain.",
};

const FEATURES: Array<{ icon: IconName; name: string; blurb: string }> = [
  {
    icon: "students",
    name: "Every student, every branch",
    blurb: "Enquiry to departure on one board, with the counsellor, the next step and the date it was due.",
  },
  {
    icon: "clock",
    name: "Attendance that knows the office",
    blurb: "Staff clock in from inside a radius you set per branch. Away days carry a reason, and the month totals itself.",
  },
  {
    icon: "tasks",
    name: "Work that survives an absence",
    blurb: "Tasks go to a person or to a desk. A team task waits for whoever picks it up rather than sitting with someone on leave.",
  },
  {
    icon: "folder",
    name: "Documents in one vault",
    blurb: "Each student's papers, what is verified, what was sent back and why. Financial documents delete themselves after the intake.",
  },
  {
    icon: "wallet",
    name: "Payroll by the Nepali month",
    blurb: "Runs keyed to Bhadra, not September, reading the days your staff actually clocked. SSF, PF, TDS, CIT and advances.",
  },
  {
    icon: "chart",
    name: "Market research, not guesswork",
    blurb: "What Nepal is searching for, which rules change and when, and which intake closes next. Beside your own numbers.",
  },
  {
    icon: "mic",
    name: "AI that does the slow jobs",
    blurb: "Mock visa interviews, SOP drafting and scoring, CV building. Your counsellor reviews, the machine drafts.",
  },
  {
    icon: "building",
    name: "Head office sees all of it",
    blurb: "Each branch works in its own office. You compare them side by side, and open any number to the list behind it.",
  },
];

const SECURITY = [
  {
    name: "One consultancy cannot see another",
    blurb: "Every query is filtered by consultancy before it runs. It is not a setting somebody can switch off.",
  },
  {
    name: "A branch sees its own office",
    blurb: "Counsellors see the students of the office they work at. Head office sees all of them. Changing the address bar does not change that.",
  },
  {
    name: "Salaries are not in the CRM",
    blurb: "The staff list carries a pay band. The figures live in payroll, behind a separate permission only the owner has.",
  },
  {
    name: "Everything is written down",
    blurb: "Who changed a stage, who verified a document, who was assigned a student, with a name and a time on it.",
  },
  {
    name: "Sessions are signed, not guessable",
    blurb: "Logins are signed server side and expire. Passwords are stored hashed with a per-account salt.",
  },
  {
    name: "Your data leaves when you do",
    blurb: "Ask and you get an export of your consultancy's own records. No lock-in through the back door.",
  },
];

const PLAN_ROWS = [
  {
    id: "starter" as const,
    for: "One office finding its feet",
    lines: ["Up to 25 active students", "One branch", "Attendance and tasks", "Document vault"],
  },
  {
    id: "growth" as const,
    for: "An established consultancy",
    lines: ["Up to 100 active students", "Up to three branches", "Payroll and HR reports", "Market research", "Partner and commission tracking"],
    featured: true,
  },
  {
    id: "pro" as const,
    for: "Multi-branch or franchise",
    lines: ["Unlimited students", "Unlimited branches", "Head office comparison", "Priority support", "Data export on request"],
  },
];

export default async function Home() {
  const user = await currentUser();

  return (
    <main>
      <GoogleAnalytics />

      {/* ---------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-30 border-b border-line bg-panel/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Logo />
          <nav className="flex items-center gap-1">
            <Link href="#features" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-2 hover:text-brand-600 sm:block">
              Features
            </Link>
            <Link href="#security" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-2 hover:text-brand-600 sm:block">
              Security
            </Link>
            <Link href="#pricing" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-2 hover:text-brand-600 sm:block">
              Pricing
            </Link>
            {user ? (
              <LinkButton href="/app" size="sm">Open my dashboard</LinkButton>
            ) : (
              <>
                <Link href="/login" className="rounded-full px-3 py-2 text-sm font-medium text-ink-2 hover:text-brand-600">Log in</Link>
                <LinkButton href="/signup" size="sm">Start free</LinkButton>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* -------------------------------------------------------------- hero */}
      <section className="border-b border-line bg-panel">
        <div className="mx-auto max-w-5xl px-5 py-20 text-center sm:py-24">
          <h1 className="display mx-auto max-w-3xl text-[38px] leading-[1.1] sm:text-[52px]">
            The system your consultancy runs on
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-2">
            Students, branches, attendance, documents, payroll and market research in one place,
            built for how consultancies in Nepal actually work.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <LinkButton href="/signup" size="lg">Start free on your own subdomain</LinkButton>
            <Link href="#features" className="inline-flex min-h-[48px] items-center rounded-full px-5 text-[15px] font-medium text-brand-600 hover:bg-brand-50">
              See what it does
            </Link>
          </div>
          <p className="mt-5 text-[13.5px] text-muted">
            Your office at <span className="font-medium text-ink">yourname.{BRAND.domain}</span>.
            No card, no sales call. Pay when it is earning its keep.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------- features */}
      <section id="features" className="border-b border-line bg-canvas">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <h2 className="display text-[28px]">What you get on day one</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.name} className="rounded-2xl border border-line bg-panel p-5">
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

      {/* ------------------------------------------------------- AI credits */}
      <section className="border-b border-line bg-panel">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-20 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="display text-[28px]">AI credits, spent where they save an hour</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
              Every plan includes a monthly pot of credits. A counsellor spends them on the jobs
              that take a person an hour and a machine a minute, and reviews the result.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {[
                ["mic", "Mock visa interview", "A rehearsal that has read the student's file and follows up when an answer is vague."],
                ["pen", "Statement of purpose", "A draft tuned to the destination, scored against what a visa officer looks for."],
                ["file", "CV for admissions", "Laid out the way offices abroad expect to read it."],
                ["checklist", "Document review", "Reads an uploaded paper and says what is missing before you send it."],
              ].map(([icon, name, blurb]) => (
                <li key={name} className="flex gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-50 text-accent-600">
                    <Icon name={icon as IconName} size={16} />
                  </span>
                  <span>
                    <span className="block text-[14.5px] font-medium text-ink">{name}</span>
                    <span className="block text-[13.5px] leading-relaxed text-muted">{blurb}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-canvas p-6">
            <h3 className="h-tight text-[16px]">And free for anyone, signed in or not</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              The calculators cost us nothing to run, so they are open. Use them across the desk in
              a first meeting.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                ["Eligibility check", "/tools/eligibility"],
                ["True cost in NPR", "/tools/cost"],
                ["Education loan EMI", "/tools/loan"],
                ["Application timeline", "/tools/checklist"],
                ["University finder", "/tools/universities"],
                ["Compare destinations", "/tools/compare"],
              ].map(([name, href]) => (
                <Link
                  key={href} href={href}
                  className="inline-flex min-h-[36px] items-center rounded-full border border-line-2 bg-panel px-3.5 text-[13px] font-medium text-ink-2 hover:border-brand-400 hover:text-brand-600"
                >
                  {name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- security */}
      <section id="security" className="border-b border-line bg-canvas">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <h2 className="display text-[28px]">Your students&rsquo; files, kept properly</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">
            You hold passports, bank statements and family income for hundreds of people. These
            are the rules the software enforces, not promises in a policy document.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SECURITY.map((s) => (
              <div key={s.name} className="rounded-2xl border border-line bg-panel p-5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-100 text-teal-700">
                  <Icon name="lock" size={17} />
                </span>
                <h3 className="h-tight mt-3 text-[15px] text-ink">{s.name}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{s.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- pricing */}
      <section id="pricing" className="border-b border-line bg-panel">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <h2 className="display text-[28px]">Three plans</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">
            Start free, move the whole office in, and pay when it is doing the work. Prices are per
            month in rupees.
          </p>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {PLAN_ROWS.map((row) => {
              const plan = PLANS[row.id];
              return (
                <div
                  key={row.id}
                  className={`flex flex-col rounded-2xl border p-6 ${
                    row.featured ? "border-brand-500 bg-brand-50" : "border-line bg-panel"}`}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="h-tight text-[18px] text-ink">{plan.label}</h3>
                    {row.featured && (
                      <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-[11px] font-medium text-white">
                        Most offices
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[13.5px] text-muted">{row.for}</p>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="num text-[32px] font-medium leading-none text-ink">
                      {plan.priceNpr.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[13.5px] text-muted">NPR / month</span>
                  </div>
                  <div className="mt-1 text-[13px] text-ink-2">
                    {plan.monthlyCredits.toLocaleString("en-IN")} AI credits a month
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
                    <LinkButton href="/signup" variant={row.featured ? "primary" : "secondary"}>
                      Start free
                    </LinkButton>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-[13.5px] text-muted">
            Every plan starts free while you set up. Nothing is charged until you ask to be
            invoiced, and there is no card on file.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------- how to start */}
      <section className="border-b border-line bg-canvas">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:py-20">
          <h2 className="display text-[28px]">Open in the time it takes to make tea</h2>
          <ol className="mx-auto mt-8 grid max-w-3xl gap-4 text-left sm:grid-cols-3">
            {[
              ["Create the account", "Your work email, not a personal one. The domain becomes your subdomain."],
              ["Add your offices", "Pin each one on the map so attendance knows where it is."],
              ["Bring the students in", "Add them, or send us your sheet and we will load it."],
            ].map(([title, blurb], i) => (
              <li key={title} className="rounded-2xl border border-line bg-panel p-5">
                <span className="num grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-[14px] font-medium text-white">
                  {i + 1}
                </span>
                <h3 className="h-tight mt-3 text-[15px] text-ink">{title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{blurb}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <LinkButton href="/signup" size="lg">Create your consultancy account</LinkButton>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ footer */}
      <footer className="mx-auto max-w-6xl px-5 py-12">
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
              <Link href="#features" className="inline-flex min-h-[36px] items-center text-ink-2 hover:text-brand-600">Features</Link>
              <Link href="#security" className="inline-flex min-h-[36px] items-center text-ink-2 hover:text-brand-600">Security</Link>
              <Link href="#pricing" className="inline-flex min-h-[36px] items-center text-ink-2 hover:text-brand-600">Pricing</Link>
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
      </footer>
    </main>
  );
}
