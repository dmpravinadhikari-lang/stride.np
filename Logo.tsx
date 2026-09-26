/**
 * OfficeYak logo. Bell mark + wordmark with the horn-Y glyph.
 * size = bell height in px. Wordmark cap-height ≈ 0.8 × size. Gap = 0.3 × size.
 * tone: "light" (navy text, on Paper/white) | "dark" (white text, on Navy) | "mono" (single colour = currentColor)
 */
import type { CSSProperties } from "react";

type Props = { size?: number; tone?: "light" | "dark" | "mono"; wordmark?: boolean; className?: string };

const Bell = ({ tone }: { tone: Props["tone"] }) => {
  const top = tone === "dark" ? "#fff" : tone === "mono" ? "currentColor" : "#15133A";
  const mono = tone === "mono";
  return (
    <svg viewBox="0 0 64 64" width="1em" height="1em" aria-hidden style={{ display: "block" }}>
      <rect x="28" y="4" width="8" height="10" rx="3" fill={top} />
      <path d="M18 18 Q32 10 46 18 L52 44 L12 44 Z" fill={mono ? "currentColor" : "#FF7A1A"} />
      <path d="M18 18 Q32 10 46 18 L48 30 L16 30 Z" fill={mono ? "currentColor" : "#F0407A"} opacity={mono ? 0.6 : 1} />
      <rect x="8" y="42" width="48" height="8" rx="4" fill={mono ? "currentColor" : "#FFC526"} />
      <circle cx="32" cy="55" r="5" fill={top} />
    </svg>
  );
};

const HornY = ({ tone, fs }: { tone: Props["tone"]; fs: number }) => {
  const mono = tone === "mono";
  const c = (col: string) => (mono ? "currentColor" : col);
  return (
    <svg viewBox="0 0 64 62" width={fs * 0.72} height={fs * 0.71} aria-hidden
      style={{ display: "block", margin: "0 -0.09em 0 0.02em" }}>
      <path d="M32 33 C30 24 21 17 9 8" fill="none" stroke={c("#F0407A")} strokeWidth="15" strokeLinecap="round" />
      <path d="M32 33 C34 24 43 17 55 8" fill="none" stroke={c("#FFC526")} strokeWidth="15" strokeLinecap="round" />
      <rect x="24" y="30" width="16" height="32" rx="7" fill={c("#FF7A1A")} />
      <circle cx="32" cy="33" r="7.5" fill={mono ? "currentColor" : tone === "dark" ? "#fff" : "#15133A"} />
    </svg>
  );
};

export function Logo({ size = 28, tone = "light", wordmark = true, className = "" }: Props) {
  const fs = Math.round(size * 0.86);
  const color = tone === "dark" ? "#fff" : tone === "light" ? "#15133A" : undefined;
  const word: CSSProperties = {
    fontFamily: "'Outfit', sans-serif", fontSize: fs, fontWeight: 600, letterSpacing: -fs * 0.035,
    lineHeight: 1, color, display: "inline-flex", alignItems: "baseline",
  };
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: size * 0.3, fontSize: size, color }}>
      <Bell tone={tone} />
      {wordmark && (
        <span style={word} aria-label="OfficeYak">
          Office<HornY tone={tone} fs={fs} /><span style={{ fontWeight: 700 }}>ak</span>
        </span>
      )}
    </span>
  );
}
