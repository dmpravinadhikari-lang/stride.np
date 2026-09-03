import Link from "next/link";
import { Reveal } from "@/components/Reveal";

/* ---------------------------------------------------------------------------
   The four things a student gets with an account, each shown rather than
   described. A person deciding whether to sign up does not know what "SOP
   Studio" means until they see what comes out of it — so every card carries a
   small, honest rendering of that tool's real output.

   The mockups are built from HTML and CSS rather than screenshots. Three
   reasons: they stay sharp on any screen, they follow the theme, and they add
   no image weight on a connection that is mobile data nine times out of ten.
--------------------------------------------------------------------------- */

type Card = {
  eyebrow: string;
  name: string;
  blurb: string;
  href: string;
  cta: string;
  tint: string;   // card background
  ink: string;    // accent that reads on that background
  mock: React.ReactNode;
};

/** A phone-sized frame the mockups sit inside, so they read as product. */
function Frame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-t-2xl border border-b-0 border-black/10 bg-white shadow-[0_20px_50px_-30px_rgba(0,22,25,.55)] ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-line px-3.5 py-2.5">
        <span className="h-2 w-2 rounded-full bg-black/12" />
        <span className="h-2 w-2 rounded-full bg-black/12" />
        <span className="h-2 w-2 rounded-full bg-black/12" />
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

/** A labelled bar that fills once its card has scrolled into view. */
function Bar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[10.5px] text-muted">
        <span>{label}</span>
        <span className="num font-semibold text-ink">{value.toFixed(1)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/7">
        <div
          className="grow-x h-full rounded-full"
          style={{ width: `${(value / 9) * 100}%`, background: tone }}
        />
      </div>
    </div>
  );
}

const MockBands = (
  <Frame>
    <div className="flex items-end justify-between">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          Overall band
        </div>
        <div className="num h-tight text-[40px] font-bold text-ink">6.5</div>
      </div>
      <div className="rounded-full bg-tint-amber px-2.5 py-1 text-[10.5px] font-semibold text-tint-amber-ink">
        Target 7.0 &middot; 0.5 to find
      </div>
    </div>
    <div className="mt-3.5 space-y-2.5">
      <Bar label="Listening" value={7.5} tone="var(--color-tint-mint-ink)" />
      <Bar label="Reading"   value={7.0} tone="var(--color-tint-mint-ink)" />
      <Bar label="Writing"   value={5.5} tone="var(--color-signal)" />
      <Bar label="Speaking"  value={6.0} tone="var(--color-tint-amber-ink)" />
    </div>
    <p className="mt-3 border-t border-line pt-2.5 text-[10.5px] leading-relaxed text-muted">
      Writing is the one holding your average down. Task 2 lost most of its marks on
      coherence.
    </p>
  </Frame>
);

const MockInterview = (
  <Frame>
    <div className="space-y-2.5">
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-wash px-3 py-2 text-[11.5px] leading-relaxed text-ink">
        Your brother is funding this. What does he do, and what does he earn?
      </div>
      <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-brand-500 px-3 py-2 text-[11.5px] leading-relaxed text-white">
        He works in Dubai and sends money home every month.
      </div>
      <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-signal/25 bg-signal-50 px-3 py-2">
        <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-signal">
          Follow-up &mdash; the answer was thin
        </div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink">
          How much, in which month, and which account did it land in?
        </p>
      </div>
    </div>
  </Frame>
);

const MockSop = (
  <Frame>
    <div className="space-y-1.5">
      <div className="h-1.5 w-full rounded-full bg-black/8" />
      <div className="h-1.5 w-[92%] rounded-full bg-black/8" />
      <div className="relative rounded-md bg-tint-rose px-1.5 py-1">
        <div className="h-1.5 w-[76%] rounded-full bg-tint-rose-ink/35" />
      </div>
      <div className="h-1.5 w-[88%] rounded-full bg-black/8" />
      <div className="h-1.5 w-[60%] rounded-full bg-black/8" />
    </div>
    <div className="mt-3.5 space-y-1.5">
      {[
        ["Ties to Nepal", "Not evidenced", "rose"],
        ["Course fit", "Specific, good", "mint"],
        ["Reads as AI-written", "Low risk", "mint"],
      ].map(([k, v, t]) => (
        <div key={k} className="flex items-center justify-between gap-2 text-[10.5px]">
          <span className="text-muted">{k}</span>
          <span
            className="rounded-full px-2 py-0.5 font-semibold"
            style={{
              background: `var(--color-tint-${t})`,
              color: `var(--color-tint-${t}-ink)`,
            }}
          >
            {v}
          </span>
        </div>
      ))}
    </div>
  </Frame>
);

const MockVault = (
  <Frame>
    <div className="space-y-2">
      {[
        ["Passport", "Verified", "mint", "✓"],
        ["Bank balance certificate", "Verified", "mint", "✓"],
        ["Source of funds", "Missing", "rose", "!"],
        ["NOC", "Not started", "amber", "·"],
      ].map(([name, state, t, mark]) => (
        <div key={name} className="flex items-center gap-2.5">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold"
            style={{
              background: `var(--color-tint-${t})`,
              color: `var(--color-tint-${t}-ink)`,
            }}
          >
            {mark}
          </span>
          <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink">{name}</span>
          <span
            className="shrink-0 text-[10px] font-semibold"
            style={{ color: `var(--color-tint-${t}-ink)` }}
          >
            {state}
          </span>
        </div>
      ))}
    </div>
    <p className="mt-3 border-t border-line pt-2.5 text-[10.5px] leading-relaxed text-muted">
      Your statement says self-funded. Your file says your brother pays. One of them has to
      change.
    </p>
  </Frame>
);

const CARDS: Card[] = [
  {
    eyebrow: "Practice",
    name: "IELTS & PTE mock tests",
    blurb:
      "Timed sections the student sits alone, marked against the published band tables. The band lands on your board, so you know who is ready to book the real test.",
    href: "/app/mock-tests",
    cta: "See a marked mock",
    tint: "var(--color-tint-sky)",
    ink: "var(--color-tint-sky-ink)",
    mock: MockBands,
  },
  {
    eyebrow: "Practice",
    name: "AI mock interview",
    blurb:
      "The interview you do not have four hours a week to sit through. It has read the file, asks about the sponsor and the study gap, and follows up when an answer is thin.",
    href: "/app/interview",
    cta: "See how it questions",
    tint: "var(--color-tint-rose)",
    ink: "var(--color-tint-rose-ink)",
    mock: MockInterview,
  },
  {
    eyebrow: "Write",
    name: "SOP Studio",
    blurb:
      "Scored the way an assessor scores it — course fit, specificity, funds, ties to Nepal — plus a check for machine-written prose. Your counsellor reviews a second draft, not a first.",
    href: "/app/sop",
    cta: "See a scored statement",
    tint: "var(--color-tint-lilac)",
    ink: "var(--color-tint-lilac-ink)",
    mock: MockSop,
  },
  {
    eyebrow: "Organise",
    name: "Document vault",
    blurb:
      "Every document Nepal and the destination ask for, uploaded once and verified by your staff. It flags what is missing, and what contradicts the file.",
    href: "/app/documents",
    cta: "See what it flags",
    tint: "var(--color-tint-amber)",
    ink: "var(--color-tint-amber-ink)",
    mock: MockVault,
  },
];

export function ServiceShowcase() {
  return (
    <div className="mt-10 grid gap-4 lg:grid-cols-2">
      {CARDS.map((c, i) => (
        <Reveal key={c.name} delay={i * 90} className="h-full">
          <article
            className="flex h-full flex-col overflow-hidden rounded-[24px] p-6 pb-0 sm:p-7 sm:pb-0"
            style={{ background: c.tint }}
          >
            <div
              className="text-[10.5px] font-semibold uppercase tracking-[0.13em]"
              style={{ color: c.ink }}
            >
              {c.eyebrow}
            </div>

            <h3 className="h-tight mt-2 text-[21px] font-bold text-ink sm:text-[23px]">
              {c.name}
            </h3>

            <p className="mt-2.5 max-w-prose text-[14px] leading-relaxed text-ink-2">
              {c.blurb}
            </p>

            <Link
              href={c.href}
              className="mt-4 inline-flex min-h-11 items-center gap-1.5 self-start text-[13px] font-bold uppercase tracking-[0.06em] hover:underline sm:min-h-0"
              style={{ color: c.ink }}
            >
              {c.cta}
              <span aria-hidden>&#8599;</span>
            </Link>

            {/* The frame is deliberately cropped by the card's bottom edge —
                it reads as a window onto a larger product rather than a
                picture that happens to be sitting there. */}
            <div className="mt-auto -mb-px px-1 pt-7 sm:px-3">{c.mock}</div>
          </article>
        </Reveal>
      ))}
    </div>
  );
}
