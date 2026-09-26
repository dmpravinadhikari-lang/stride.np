import Link from "next/link";
import { BRAND } from "@/lib/brand";

/**
 * The lockup: the mark, then the wordmark.
 *
 * Three squares rotated onto a rising diagonal, sized 1 : φ : φ², which the
 * brand guidelines read as footsteps: pink is the enquiry, orange is the
 * preparation, yellow is the departure. The geometry is not decorative and is
 * not re-derived here, it is the mark file redrawn inline so it takes the
 * theme and costs no request.
 *
 * The proportions come from the guidelines and are held in one place: cap
 * height is the mark divided by φ, the gap between them is the mark divided
 * by φ², and the clear space around the whole thing is the mark divided by φ.
 * Below a 16px mark or a 100px lockup the squares stop being distinguishable,
 * so nothing here is ever drawn smaller.
 */

/** The golden ratio, which every measurement in the mark is derived from. */
const PHI = 1.618;

export function Mark({ size = 28, tone = "colour" }: { size?: number; tone?: "colour" | "white" | "navy" }) {
  // Never below the minimum in the guidelines: the smallest square would
  // disappear and the mark would read as two shapes, not three.
  const px = Math.max(16, size);
  const fill =
    tone === "white"
      ? ["#FFFFFF", "#FFFFFF", "#FFFFFF"]
      : tone === "navy"
        ? ["#15133A", "#15133A", "#15133A"]
        : ["#F0407A", "#FF7A1A", "#FFC526"];
  const opacity = tone === "colour" ? [1, 1, 1] : tone === "white" ? [0.55, 0.78, 1] : [0.45, 0.7, 1];

  return (
    <svg
      viewBox="0 0 64 64" width={px} height={px} aria-hidden
      className="shrink-0"
    >
      <rect x="6.4" y="48.6" width="9" height="9" rx="1.5" transform="rotate(45 10.9 53.1)" fill={fill[0]} opacity={opacity[0]} />
      <rect x="16.96" y="32.48" width="14.56" height="14.56" rx="2.2" transform="rotate(45 24.24 39.76)" fill={fill[1]} opacity={opacity[1]} />
      <rect x="34.02" y="6.42" width="23.56" height="23.56" rx="3.5" transform="rotate(45 45.8 18.2)" fill={fill[2]} opacity={opacity[2]} />
    </svg>
  );
}

export function Logo({
  href = "/", tone = "dark", size = 19,
}: { href?: string; tone?: "dark" | "light"; size?: number }) {
  // The wordmark is set to the cap height the guidelines give: mark ÷ φ. So
  // the mark is derived from the type size rather than the other way round,
  // which is how a lockup stays in proportion wherever it is dropped.
  const mark = Math.round(size * PHI);
  const gap = Math.round(mark / (PHI * PHI));

  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center py-1 sm:min-h-0 sm:py-0"
      aria-label={`${BRAND.name} home`}
      style={{ gap }}
    >
      <Mark size={mark} tone={tone === "light" ? "white" : "colour"} />
      <span
        className={`font-semibold ${tone === "dark" ? "text-ink" : "text-white"}`}
        style={{ fontSize: size, letterSpacing: "-0.035em", lineHeight: 1 }}
      >
        {BRAND.wordmark}
      </span>
    </Link>
  );
}
