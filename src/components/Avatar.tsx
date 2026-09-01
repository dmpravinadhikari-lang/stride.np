const TINTS: Record<string, [bg: string, ink: string]> = {
  sky: ["var(--color-tint-sky)", "var(--color-tint-sky-ink)"],
  lilac: ["var(--color-tint-lilac)", "var(--color-tint-lilac-ink)"],
  mint: ["var(--color-tint-mint)", "var(--color-tint-mint-ink)"],
  peach: ["var(--color-tint-peach)", "var(--color-tint-peach-ink)"],
  amber: ["var(--color-tint-amber)", "var(--color-tint-amber-ink)"],
  rose: ["var(--color-tint-rose)", "var(--color-tint-rose-ink)"],
};

/**
 * An initials avatar, drawn rather than photographed.
 *
 * A generated portrait of a person who does not exist, sitting next to a
 * student testimonial, is a fabricated person. Initials on a tinted disc say
 * exactly as much, look deliberate, and cannot mislead anyone. Real photos can
 * replace these once students send them with permission.
 */
export function Avatar({ name, tint = "sky", size = 44 }: { name: string; tint?: string; size?: number }) {
  const initials = name
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "").join("");
  const [bg, ink] = TINTS[tint] ?? TINTS.sky;

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, background: bg, color: ink, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}
