import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { COMPETITIVENESS, SCHOLARSHIPS, scholarshipById } from "@/modules/finder/scholarships";
import { COUNTRIES } from "@/lib/countries";
import { LEVEL_LABEL } from "@/modules/cost/data";
import { npr } from "@/lib/terms";
import { BRAND } from "@/lib/brand";
import { Card, Chip, LinkButton, type Tone } from "@/components/ui";

export function generateStaticParams() {
  return SCHOLARSHIPS.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = scholarshipById(id);
  if (!s) return { title: "Not found" };
  return {
    title: `${s.name} for Nepali students, value, eligibility and deadlines | ${BRAND.name}`,
    description: `${s.name} from ${s.funder}: what it covers, what it is worth in rupees, who actually wins it, when it closes and how to apply from Nepal.`,
    alternates: { canonical: `/tools/scholarships/${s.id}` },
  };
}

const COVER: Record<string, { label: string; tone: Tone }> = {
  full: { label: "Full ride", tone: "teal" },
  partial: { label: "Partial", tone: "brand" },
  "fee-waiver": { label: "Fee reduction", tone: "grey" },
};
const COMP_TONE: Record<string, Tone> = {
  "very-high": "danger", high: "gold", moderate: "brand", accessible: "teal",
};

export default async function ScholarshipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = scholarshipById(id);
  if (!s) notFound();

  const cover = COVER[s.cover];
  const comp = COMPETITIVENESS[s.competitiveness];
  const sameRange = s.valueNprLow === s.valueNprHigh;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: `What is the ${s.name} worth?`,
        acceptedAnswer: { "@type": "Answer", text: `${s.value}. Indicatively worth ${sameRange ? npr(s.valueNprLow) : `${npr(s.valueNprLow)} to ${npr(s.valueNprHigh)}`} to a Nepali student.` } },
      { "@type": "Question", name: `Who is eligible for the ${s.name}?`,
        acceptedAnswer: { "@type": "Answer", text: s.eligibility.join(" ") } },
      { "@type": "Question", name: `When does the ${s.name} close?`,
        acceptedAnswer: { "@type": "Answer", text: s.window } },
    ],
  };

  return (
    <article className="mx-auto max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/tools/scholarships" className="inline-flex min-h-[40px] items-center text-[12.5px] font-semibold text-muted hover:text-brand-600">← All scholarships</Link>

      <header className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={cover.tone}>{cover.label}</Chip>
          <Chip tone={COMP_TONE[s.competitiveness]}>{comp.label}</Chip>
          {s.countries.length < 6 && s.countries.map((c) => (
            <span key={c} className="text-[15px]" title={COUNTRIES[c].name}>{COUNTRIES[c].flag}</span>
          ))}
        </div>
        <h1 className="display mt-4 text-[34px] leading-[1.1] sm:text-[40px]">{s.name}</h1>
        <p className="mt-2 text-[15px] text-muted">{s.funder}</p>
      </header>

      {/* the number a family actually wants */}
      <Card className="mt-7 border-teal-500/30 bg-teal-100/40 p-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-teal-700">
          What it is worth to you
        </div>
        <div className="num mt-1.5 text-[36px] font-semibold leading-none text-ink">
          {sameRange ? npr(s.valueNprLow) : `${npr(s.valueNprLow)}, ${npr(s.valueNprHigh)}`}
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{s.value}</p>
        <p className="mt-3 border-t border-teal-500/20 pt-3 text-[12.5px] leading-relaxed text-ink-2">
          An estimate of the tuition and living costs this removes, at typical course prices for
          the destination. The funder does not publish a rupee figure, treat this as the scale of
          the prize, not a quotation.
        </p>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Closes</div>
          <div className="mt-1 text-[14px] font-semibold text-ink">{s.window}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Level</div>
          <div className="mt-1 text-[14px] font-semibold text-ink">
            {s.levels.map((l) => LEVEL_LABEL[l]).join(", ")}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Your odds</div>
          <div className="mt-1 text-[14px] font-semibold text-ink">{comp.label}</div>
          <div className="mt-0.5 text-[12px] leading-snug text-muted">{comp.note}</div>
        </Card>
      </div>

      <Card className="mt-4 p-6">
        <h2 className="h-tight text-[18px]">Who actually wins it</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{s.whoWins}</p>
      </Card>

      <Card className="mt-4 p-6">
        <h2 className="h-tight text-[18px]">What they ask for</h2>
        <ul className="mt-3 flex flex-col gap-2.5">
          {s.eligibility.map((e, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-ink-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" aria-hidden />
              {e}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-4 p-6">
        <h2 className="h-tight text-[18px]">How to apply, in order</h2>
        <ol className="mt-3 flex flex-col gap-3">
          {s.howToApply.map((step, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-ink-2">
              <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[12px] font-semibold text-brand-600">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </Card>

      {s.nepalNote && (
        <Card className="mt-4 border-brand-200 bg-tint-lilac/50 p-6">
          <h2 className="h-tight text-[16px] text-brand-700">For applicants from Nepal</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{s.nepalNote}</p>
        </Card>
      )}

      <Card className="mt-4 p-6">
        <h2 className="h-tight text-[18px]">Before you count on it</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Build your plan on funds you actually have, and treat a scholarship as a reduction if it
          arrives. Visa officers assess the money you can evidence today, not an award you have
          applied for.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <LinkButton href="/tools/cost" size="md" variant="secondary">Cost the course without it</LinkButton>
          {s.site && (
            <a href={s.site} target="_blank" rel="noreferrer"
              className="inline-flex items-center rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
              Official page and this year's dates ↗
            </a>
          )}
        </div>
      </Card>

      <p className="mt-6 text-[12px] leading-relaxed text-muted">
        Application windows are the usual months, not fixed dates, and rules change between rounds.
        Always confirm on the funder's own page before planning around one.
      </p>
    </article>
  );
}
