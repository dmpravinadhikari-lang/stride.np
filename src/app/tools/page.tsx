import Link from "next/link";
import type { Metadata } from "next";
import { Card, Chip, LinkButton, type Tint } from "@/components/ui";
import { TOOL_MARKS } from "@/components/tool-icons";

export const metadata: Metadata = {
  title: "Free study abroad tools for Nepali students | OfficeYak",
  description:
    "Free calculators and finders for Nepali students going to Australia, New Zealand, the UK, Ireland, the USA and Canada. Work out the true cost in NPR, check your eligibility, estimate an education loan EMI, and find universities and scholarships. No account needed.",
};

const TOOLS: Array<{
  href: string; icon: string; name: string; blurb: string; q: string; tint: Tint;
  /** The two questions everyone arrives with. These get the big treatment. */
  featured?: boolean; cta?: string;
}> = [
  {
    href: "/tools/eligibility", tint: "mint", icon: "✅", name: "Eligibility check",
    featured: true, cta: "Check in one minute",
    blurb: "Can you actually get in, and get the visa? An honest answer in one minute, based on your grades, your English score and your funds.",
    q: "Am I eligible to study abroad?",
  },
  {
    href: "/tools/cost", tint: "sky", icon: "🧮", name: "True cost calculator",
    featured: true, cta: "Work out my total",
    blurb: "The whole cost in NPR: tuition, living, visa, flights, and separately the bank balance the embassy requires you to show.",
    q: "How much does it really cost?",
  },
  {
    href: "/tools/loan", tint: "amber", icon: "🏦", name: "Education loan EMI",
    blurb: "What a Nepali education loan really costs to repay, interest during study included.",
    q: "What will the loan cost me?",
  },
  {
    href: "/tools/universities", tint: "peach", icon: "🎓", name: "University finder",
    blurb: "Institutions matched to your grades, budget and English, including the ones out of reach, and why.",
    q: "Where can I get in?",
  },
  {
    href: "/tools/scholarships", tint: "rose", icon: "💰", name: "Scholarship finder",
    blurb: "Funding a Nepali student can realistically get, and what each one demands.",
    q: "Is there any funding?",
  },
  {
    href: "/tools/checklist", tint: "lilac", icon: "🗓️", name: "Application timeline",
    blurb: "Every step to boarding, dated backwards from your intake month.",
    q: "When do I have to do what?",
  },
  {
    href: "/tools/cv-maker", tint: "lilac", icon: "📄", name: "CV maker",
    blurb: "A CV set out the way admissions offices abroad expect, with what is still thin flagged.",
    q: "Is my CV good enough?",
  },
  {
    href: "/tools/compare", tint: "sky", icon: "⚖️", name: "Compare destinations",
    blurb: "Two countries side by side on cost, visa, work rights and bank balance.",
    q: "Australia or the UK?",
  },
];

export default function ToolsHub() {
  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <Chip tone="teal">Free · no account needed</Chip>
        <h1 className="display mt-4 text-[36px] sm:text-[44px]">
          The questions you cannot get a straight answer to.
        </h1>
        <p className="mt-4 text-[16.5px] leading-relaxed text-ink-2">
          Eight tools for going abroad from Nepal, six destinations, every figure in rupees. No
          sign-up, no phone number, nobody calling you afterwards.
        </p>
      </header>

      {/* The two that answer the questions everyone actually arrives with get a
          full-tint card each. The rest are a quieter grid underneath, a page
          where eight things shout equally is a page with no starting point. */}
      <div className="grid gap-4 lg:grid-cols-2">
        {TOOLS.filter((t) => t.featured).map((t) => {
          const Mark = TOOL_MARKS[t.href];
          return (
            <Link
              key={t.href} href={t.href}
              className="lift group relative overflow-hidden rounded-[24px] p-6 sm:p-7"
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
              <h2 className="h-tight mt-1 text-[24px] font-bold text-ink sm:text-[27px]">{t.name}</h2>
              <p className="mt-2.5 max-w-md text-[14.5px] leading-relaxed text-ink-2">{t.blurb}</p>

              <span
                className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.06em] group-hover:underline sm:min-h-0"
                style={{ color: `var(--color-tint-${t.tint}-ink)` }}
              >
                {t.cta} <span aria-hidden>&#8599;</span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.filter((t) => !t.featured).map((t) => {
          const Mark = TOOL_MARKS[t.href];
          return (
            <Link
              key={t.href} href={t.href}
              className="lift group flex gap-3.5 rounded-[20px] border border-line bg-panel p-4 hover:border-brand-400"
            >
              {Mark && <Mark tint={t.tint} />}
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-brand-600">{t.q}</div>
                <h2 className="h-tight mt-0.5 text-[15.5px] group-hover:text-brand-600">{t.name}</h2>
                <p className="mt-1 text-[12.5px] leading-snug text-muted">{t.blurb}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <Card className="border-brand-200 bg-brand-50/60 p-6">
        <h2 className="h-tight text-[20px]">The tools are free. The practice is what costs.</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Calculators cost nothing to run, so they stay free. What needs an account is the AI:
          IELTS mocks marked against the official criteria, a visa interview that has read your
          file, and a statement scored the way an assessor scores it.
        </p>
        <p className="mt-2.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          Those come with the consultancy advising you. Ask them to open your file. Your
          sign-in details arrive by email, and everything on this page carries across.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <LinkButton href="/signup" size="md">I run a consultancy</LinkButton>
          <LinkButton href="/" size="md" variant="secondary">See everything OfficeYak does</LinkButton>
        </div>
      </Card>
    </div>
  );
}
