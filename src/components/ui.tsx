import Link from "next/link";
import type { ReactNode } from "react";

/* Shared building blocks. Everything visual in STRIDE comes from here so the
   product stays consistent as modules are added. */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`settle rounded-[20px] border border-line bg-panel ${className}`}>{children}</div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

const TONES = {
  brand: "bg-brand-50 text-brand-700 border-brand-200",
  teal: "bg-teal-100 text-teal-700 border-teal-500/30",
  gold: "bg-gold-100 text-gold-600 border-gold-600/25",
  danger: "bg-danger-100 text-danger-600 border-danger-600/25",
  grey: "bg-wash text-muted border-line-2",
} as const;
export type Tone = keyof typeof TONES;

export function Chip({ tone = "grey", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function Button({
  children, variant = "primary", size = "md", type = "button", className = "", ...rest
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: "bg-brand-500 text-white hover:bg-brand-600 disabled:bg-brand-200",
    secondary: "bg-white text-ink border border-line-2 hover:border-brand-400 hover:text-brand-600",
    ghost: "text-ink-2 hover:bg-wash",
    danger: "bg-white text-danger-600 border border-danger-600/30 hover:bg-danger-100",
  };
  const sizes = { sm: "min-h-[40px] px-4 text-[13px]", md: "min-h-[44px] px-5 text-sm", lg: "min-h-[52px] px-7 text-[15px]" };
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href, children, variant = "primary", size = "md",
}: {
  href: string; children: ReactNode;
  variant?: "primary" | "secondary" | "ghost"; size?: "sm" | "md" | "lg";
}) {
  const variants = {
    primary: "bg-brand-500 text-white hover:bg-brand-600",
    secondary: "bg-white text-ink border border-line-2 hover:border-brand-400 hover:text-brand-600",
    ghost: "text-ink-2 hover:bg-wash",
  };
  const sizes = { sm: "min-h-[40px] px-4 text-[13px]", md: "min-h-[44px] px-5 text-sm", lg: "min-h-[52px] px-7 text-[15px]" };
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors ${variants[variant]} ${sizes[size]}`}>
      {children}
    </Link>
  );
}

export function Alert({ tone = "brand", title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  const border = {
    brand: "border-brand-200 bg-brand-50", teal: "border-teal-500/25 bg-teal-100",
    gold: "border-gold-600/25 bg-gold-100", danger: "border-danger-600/25 bg-danger-100",
    grey: "border-line bg-wash",
  }[tone];
  return (
    <div className={`rounded-2xl border px-4 py-3.5 text-sm ${border}`}>
      {title && <div className="h-tight mb-1 text-[13px] font-semibold">{title}</div>}
      <div className="text-ink-2">{children}</div>
    </div>
  );
}

export function StatTile({ label, value, sub, tone = "brand" }: { label: string; value: ReactNode; sub?: string; tone?: Tone }) {
  const accent = { brand: "text-brand-600", teal: "text-teal-700", gold: "text-gold-600", danger: "text-danger-600", grey: "text-ink" }[tone];
  return (
    <div className="rounded-[20px] border border-line bg-panel px-5 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className={`num mt-1.5 text-2xl font-semibold ${accent}`}>{value}</div>
      {sub && <div className="mt-1 text-[12.5px] leading-snug text-muted">{sub}</div>}
    </div>
  );
}

export function Meter({ value, max = 100, tone = "brand" }: { value: number; max?: number; tone?: Tone }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const fill = { brand: "bg-brand-500", teal: "bg-teal-500", gold: "bg-gold-600", danger: "bg-danger-600", grey: "bg-line-2" }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-wash" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Field({
  label, name, hint, children,
}: { label: string; name?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5" htmlFor={name}>
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="text-[12px] leading-snug text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line-2 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-brand-400 focus:outline-none focus-visible:outline-none";

/**
 * A wide table has to scroll sideways on a phone, but mobile browsers hide
 * scrollbars — so without a word, the last three columns simply do not exist
 * as far as the reader is concerned. This says so, and only where it applies.
 */
export function ScrollHint({ children = "Swipe the table sideways to see every column" }: { children?: ReactNode }) {
  return (
    <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted sm:hidden" aria-hidden>
      <span className="motion-safe:animate-[nudge_1.6s_ease-in-out_infinite]">→</span>
      {children}
    </p>
  );
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-dashed border-line-2 bg-panel px-6 py-12 text-center">
      <div className="text-3xl" aria-hidden>{icon}</div>
      <div className="h-tight mt-3 text-lg">{title}</div>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}

export const TINTS = ["sky", "lilac", "mint", "peach", "amber", "rose"] as const;
export type Tint = (typeof TINTS)[number];

/** A circular wash behind an icon. Where most of the colour on the site lives. */
export function Badge({ tint, children }: { tint: Tint; children: ReactNode }) {
  const bg: Record<Tint, string> = {
    sky: "bg-tint-sky", lilac: "bg-tint-lilac", mint: "bg-tint-mint",
    peach: "bg-tint-peach", amber: "bg-tint-amber", rose: "bg-tint-rose",
  };
  return <span className={`badge ${bg[tint]}`} aria-hidden>{children}</span>;
}

export function SeverityChip({ severity }: { severity: "critical" | "warning" | "note" }) {
  const map = {
    critical: { tone: "danger" as Tone, label: "Critical" },
    warning: { tone: "gold" as Tone, label: "Warning" },
    note: { tone: "grey" as Tone, label: "Note" },
  }[severity];
  return <Chip tone={map.tone}>{map.label}</Chip>;
}

export function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const stroke = pct >= 75 ? "var(--color-teal-500)" : pct >= 50 ? "var(--color-gold-600)" : "var(--color-danger-600)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${Math.round(pct)} out of 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth="8" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em"
        style={{ fontFamily: "var(--font-mono)", fontSize: size * 0.28, fontWeight: 600, fill: "var(--color-ink)" }}>
        {Math.round(pct)}
      </text>
    </svg>
  );
}
