import Link from "next/link";
import type { ReactNode } from "react";

/* Shared building blocks. Everything visual in STRIDE comes from here so the
   product stays consistent as modules are added. */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`settle rounded-xl border border-line bg-panel ${className}`}>{children}</div>
  );
}

/** A card with a title bar. The shape most of the console is built from. */
export function Panel({
  title, note, actions, children, className = "",
}: { title: ReactNode; note?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-line bg-panel ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h2 className="h-tight text-[15px] text-ink">{title}</h2>
          {note && <p className="mt-0.5 text-[12.5px] text-muted">{note}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Column headings for a console table. One place, so they always match. */
export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th className={`whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted ${className}`}>
      {children}
    </th>
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
  accent: "bg-accent-50 text-accent-600 border-accent-500/30",
  sky: "bg-tint-sky text-tint-sky-ink border-tint-sky-ink/20",
  lilac: "bg-tint-lilac text-tint-lilac-ink border-tint-lilac-ink/20",
  grey: "bg-wash text-ink-2 border-line-2",
} as const;
export type Tone = keyof typeof TONES;

export function Chip({ tone = "grey", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}

/* One set of button skins, shared by the button and the link that looks like
   one, so a primary action never has two slightly different shapes. */
const BUTTON = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 disabled:bg-brand-200",
  secondary: "border border-line-2 bg-panel text-ink hover:border-brand-400 hover:text-brand-600",
  ghost: "text-ink-2 hover:bg-wash",
  danger: "border border-danger-600/30 bg-panel text-danger-600 hover:bg-danger-100",
} as const;

export function Button({
  children, variant = "primary", size = "md", type = "button", className = "", ...rest
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizes = { sm: "min-h-[36px] px-3.5 text-[13px]", md: "min-h-[40px] px-4 text-[13.5px]", lg: "min-h-[48px] px-6 text-[15px]" };
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${BUTTON[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href, children, variant = "primary", size = "md", className = "",
}: {
  href: string; children: ReactNode;
  variant?: "primary" | "secondary" | "ghost"; size?: "sm" | "md" | "lg"; className?: string;
}) {
  const sizes = { sm: "min-h-[36px] px-3.5 text-[13px]", md: "min-h-[40px] px-4 text-[13.5px]", lg: "min-h-[48px] px-6 text-[15px]" };
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-1.5 rounded-[10px] font-semibold transition-colors ${BUTTON[variant]} ${sizes[size]} ${className}`}>
      {children}
    </Link>
  );
}

export function Alert({ tone = "brand", title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  const border = {
    brand: "border-brand-200 bg-brand-50", teal: "border-teal-500/25 bg-teal-100",
    gold: "border-gold-600/25 bg-gold-100", danger: "border-danger-600/25 bg-danger-100",
    accent: "border-accent-500/25 bg-accent-50",
    sky: "border-tint-sky-ink/20 bg-tint-sky",
    lilac: "border-tint-lilac-ink/20 bg-tint-lilac",
    grey: "border-line bg-wash",
  }[tone];
  return (
    <div className={`rounded-xl border px-4 py-3 text-[13.5px] ${border}`}>
      {title && <div className="h-tight mb-0.5 text-[14px] font-semibold text-ink">{title}</div>}
      <div className="text-ink-2">{children}</div>
    </div>
  );
}

export function StatTile({ label, value, sub, tone = "brand" }: { label: string; value: ReactNode; sub?: string; tone?: Tone }) {
  const ink = {
    brand: "text-ink", teal: "text-teal-700", gold: "text-gold-600",
    danger: "text-danger-600", accent: "text-accent-600",
    sky: "text-tint-sky-ink", lilac: "text-tint-lilac-ink", grey: "text-ink",
  }[tone];
  const bar = {
    brand: "bg-brand-500", teal: "bg-teal-500", gold: "bg-gold-600",
    danger: "bg-danger-600", accent: "bg-accent-500",
    sky: "bg-tint-sky-ink", lilac: "bg-tint-lilac-ink", grey: "bg-line-2",
  }[tone];
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-panel px-4 py-3.5">
      <span className={`absolute inset-y-0 left-0 w-[3px] ${bar}`} aria-hidden />
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className={`num mt-1 text-[26px] font-semibold leading-none ${ink}`}>{value}</div>
      {sub && <div className="mt-1.5 text-[12.5px] leading-snug text-muted">{sub}</div>}
    </div>
  );
}

export function Meter({ value, max = 100, tone = "brand" }: { value: number; max?: number; tone?: Tone }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const fill = {
    brand: "bg-brand-500", teal: "bg-teal-500", gold: "bg-gold-600", danger: "bg-danger-600",
    accent: "bg-accent-500", sky: "bg-tint-sky-ink", lilac: "bg-tint-lilac-ink", grey: "bg-line-2",
  }[tone];
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
      <span className="text-[12.5px] font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="text-[12px] leading-snug text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "min-h-[40px] w-full rounded-[10px] border border-line-2 bg-panel px-3 py-2 text-[13.5px] text-ink placeholder:text-muted/70 transition-shadow focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

/**
 * A wide table has to scroll sideways on a phone, but mobile browsers hide
 * scrollbars. So without a word, the last three columns simply do not exist
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

export function Empty({
  icon, title, children, action,
}: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-2 bg-panel px-6 py-10 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-wash text-brand-600" aria-hidden>{icon}</div>
      <div className="h-tight mt-3 text-lg">{title}</div>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * The top of every app page: what this page is, one line on it, and the main
 * thing you can do here as a button on the right. Someone new should never
 * have to hunt for how to start.
 */
export function PageHeader({
  title, sub, actions,
}: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="display text-[24px] text-ink">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** An empty value in a table or tile. Words, so it never looks like a glitch. */
export function NotSet({ children = "Not yet" }: { children?: ReactNode }) {
  return <span className="font-sans text-[12.5px] font-normal text-muted">{children}</span>;
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
