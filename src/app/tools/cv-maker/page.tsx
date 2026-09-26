import type { Metadata } from "next";
import { CountVisit } from "@/components/CountVisit";
import { CvBuilder } from "@/modules/cv/ui/CvBuilder";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Free CV maker for Nepali students | ${BRAND.name}`,
  description:
    "Build a CV for a university, a scholarship or a job abroad. Set out the way admissions offices in Australia, the UK, Canada and New Zealand expect to read it. Free, no sign-up.",
  alternates: { canonical: "/tools/cv-maker" },
};

/**
 * The CV maker, carried across from the Happy Panda codebase and rewired to
 * OfficeYak's data and metering.
 *
 * It sits with the free tools because the part that matters, laying a CV out
 * the way an admissions office expects, is ordinary work a browser can do.
 * The two steps that call AI, reading a certificate photo and reading a
 * pasted CV, are refused politely for a signed-out visitor and offered to
 * anyone whose consultancy has given them an account.
 */
export default function CvMakerPage() {
  return (
    <>
      <CountVisit tool="cv-maker" />

      <header className="mb-8 max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-tint-mint px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-tint-mint-ink">
          Free, no account needed
        </span>
        <h1 className="display mt-4 text-[34px] sm:text-[42px]">
          A CV an admissions office will actually read.
        </h1>
        <p className="mt-3 text-[16.5px] leading-relaxed text-ink-2">
          Nepali CVs carry things admissions offices abroad do not expect, and leave out things
          they look for first. This lays yours out the way each destination reads it, then tells
          you what is still thin.
        </p>
      </header>

      <CvBuilder />
    </>
  );
}
