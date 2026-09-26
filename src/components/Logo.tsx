import Link from "next/link";
import type { CSSProperties } from "react";
import { BRAND } from "@/lib/brand";

/**
 * The OfficeYak lockup: the bell, then the wordmark with the horn-Y in it.
 *
 * Drawn in markup rather than loaded from public/brand, for the reason every
 * lockup in a product should be: it takes the theme, it stays sharp at any
 * size, and it costs no request on a Kathmandu connection. The files are
 * still there, and they are what goes to a printer or a partner.
 *
 * The proportions are the guidelines' and are not invented here: the wordmark
 * cap height is 0.8 of the bell, the gap between them is 0.3 of the bell, and
 * the clear space around the whole thing is half a bell. Nothing is drawn
 * below the stated minimums, where the horn-Y stops reading as a letter.
 *
 * Three tones, and which one to use is a rule rather than a preference: full
 * colour on Paper or Navy, white mono on orange and pink, navy mono on
 * yellow. The colours in the mark must never sit on a ground made of the same
 * colours.
 */

type Tone = "light" | "dark" | "mono";

const MIN_BELL = 16;
const MIN_HORN = 12;

function Bell({ tone }: { tone: Tone }) {
  const mono = tone === "mono";
  const ink = tone === "dark" ? "#fff" : mono ? "currentColor" : "#15133A";
  return (
    <svg viewBox="0 0 64 64" width="1em" height="1em" aria-hidden style={{ display: "block" }}>
      <rect x="28" y="4" width="8" height="10" rx="3" fill={ink} />
      <path d="M18 18 Q32 10 46 18 L52 44 L12 44 Z" fill={mono ? "currentColor" : "#FF7A1A"} />
      <path d="M18 18 Q32 10 46 18 L48 30 L16 30 Z" fill={mono ? "currentColor" : "#F0407A"} opacity={mono ? 0.6 : 1} />
      <rect x="8" y="42" width="48" height="8" rx="4" fill={mono ? "currentColor" : "#FFC526"} />
      <circle cx="32" cy="55" r="5" fill={ink} />
    </svg>
  );
}

function HornY({ tone, fs }: { tone: Tone; fs: number }) {
  const mono = tone === "mono";
  const c = (colour: string) => (mono ? "currentColor" : colour);
  const size = Math.max(MIN_HORN, fs * 0.72);
  return (
    <svg
      viewBox="0 0 64 62" width={size} height={size * 0.97} aria-hidden
      style={{ display: "block", margin: "0 -0.09em 0 0.02em" }}
    >
      <path d="M32 33 C30 24 21 17 9 8" fill="none" stroke={c("#F0407A")} strokeWidth="15" strokeLinecap="round" />
      <path d="M32 33 C34 24 43 17 55 8" fill="none" stroke={c("#FFC526")} strokeWidth="15" strokeLinecap="round" />
      <rect x="24" y="30" width="16" height="32" rx="7" fill={c("#FF7A1A")} />
      <circle cx="32" cy="33" r="7.5" fill={mono ? "currentColor" : tone === "dark" ? "#fff" : "#15133A"} />
    </svg>
  );
}

/** The bell on its own, for a favicon, a watermark or a tight corner. */
export function Mark({ size = 28, tone = "light" }: { size?: number; tone?: Tone }) {
  return (
    <span style={{ fontSize: Math.max(MIN_BELL, size), display: "inline-flex" }}>
      <Bell tone={tone} />
    </span>
  );
}

export function Logo({
  href, tone = "light", size = 28, wordmark = true, className = "",
}: {
  /** Omit to render the lockup without wrapping it in a link. */
  href?: string;
  tone?: Tone;
  /** The bell's height. Everything else is derived from it. */
  size?: number;
  wordmark?: boolean;
  className?: string;
}) {
  const bell = Math.max(MIN_BELL, size);
  const fs = Math.round(bell * 0.86);
  const colour = tone === "dark" ? "#fff" : tone === "light" ? "#15133A" : undefined;

  const word: CSSProperties = {
    fontFamily: "var(--font-sans-ui), 'Outfit', sans-serif",
    fontSize: fs, fontWeight: 600, letterSpacing: -fs * 0.035,
    lineHeight: 1, color: colour, display: "inline-flex", alignItems: "baseline",
  };

  const lockup = (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: bell * 0.3, fontSize: bell, color: colour }}
    >
      <Bell tone={tone} />
      {wordmark && (
        <span style={word} aria-label={BRAND.name}>
          Office<HornY tone={tone} fs={fs} /><span style={{ fontWeight: 700 }}>ak</span>
        </span>
      )}
    </span>
  );

  return href ? (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center py-1 sm:min-h-0 sm:py-0"
      aria-label={`${BRAND.name} home`}
    >
      {lockup}
    </Link>
  ) : (
    lockup
  );
}

/**
 * The ridge: three peaks in the brand's own order, pink then orange then
 * yellow, along the bottom of a light band or flipped along the top of a dark
 * one. It is the only decoration the guidelines allow, so it is here rather
 * than redrawn by whoever needs it next.
 */
export function Ridge({
  flip = false, opacity = 1, className = "", height = 80,
}: { flip?: boolean; opacity?: number; className?: string; height?: number }) {
  return (
    <svg
      viewBox="0 0 400 80" preserveAspectRatio="none" aria-hidden
      className={className}
      style={{ height, width: "100%", display: "block", opacity, transform: flip ? "scaleY(-1)" : undefined }}
    >
      <polygon points="0,80 60,30 120,80" fill="#F0407A" />
      <polygon points="80,80 160,10 240,80" fill="#FF7A1A" />
      <polygon points="200,80 270,26 340,80" fill="#FFC526" />
      <polygon points="300,80 360,40 400,64 400,80" fill="#F0407A" opacity="0.8" />
    </svg>
  );
}
