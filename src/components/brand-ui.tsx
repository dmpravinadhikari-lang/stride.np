import type { ReactNode } from "react";
import { Ridge } from "@/components/Logo";
import { Icon, type IconName } from "@/components/Icon";

/**
 * The pieces the guidelines draw but the product had never been given.
 *
 * The homepage mockup and the dashboard section of the brand book share one
 * vocabulary: three peaks in pink, orange and yellow, a 36px tinted tile, a
 * small rotated square, a KPI in mono over a three-pixel rule, and a Navy
 * card carrying either the ridge along its foot or the bell cropped into a
 * corner. Everything here is that vocabulary and nothing else, so a screen
 * that needs it does not invent a fourth version of it.
 *
 * The peaks are not decoration. The mockup uses them to say that every part
 * of the product belongs to one of three jobs - grow the office, prepare the
 * student, run the place - and the colour is how you tell at a glance which
 * job a card is about. Used that way the colour carries information; used as
 * eight pastel squares it carries none, which is why the palette rules are
 * as narrow as they are.
 */

export type Peak = "grow" | "prepare" | "run";

/** Pink, orange, yellow, in the order the brand run always goes. */
export const PEAK = {
  grow:    { tint: "bg-tint-pink",   ink: "text-tint-pink-ink",   rule: "bg-[#F0407A]", square: "bg-[#F0407A]" },
  prepare: { tint: "bg-tint-orange", ink: "text-tint-orange-ink", rule: "bg-[#FF7A1A]", square: "bg-[#FF7A1A]" },
  run:     { tint: "bg-tint-yellow", ink: "text-tint-yellow-ink", rule: "bg-[#FFC526]", square: "bg-[#FFC526]" },
} as const;

/** The 36px tile the icon rules ask for: radius 10, group tint, Ink or peak ink. */
export function TintTile({ icon, peak, size = 36 }: { icon: IconName; peak: Peak; size?: number }) {
  const p = PEAK[peak];
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-[10px] ${p.tint} ${p.ink}`}
      style={{ width: size, height: size }}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} />
    </span>
  );
}

/** The rotated square: the mark's own geometry, at the size a label wants. */
export function Diamond({ peak, size = 12 }: { peak: Peak; size?: number }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rotate-45 rounded-[3px] ${PEAK[peak].square}`}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * A KPI the way the dashboard section sets one: the figure in mono, and a
 * three-pixel rule beneath it in the peak's colour. The rule is what tells
 * you which of the three jobs the number belongs to without reading a word.
 */
export function Kpi({
  value, label, peak = "prepare", sub, size = 22, tone = "light",
}: {
  value: ReactNode;
  label: string;
  peak?: Peak;
  sub?: string;
  /** The figure's size. 22 is the dashboard default; a hero number goes bigger. */
  size?: number;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <div>
      <div
        className={`mono font-medium leading-none ${dark ? "text-white" : "text-ink"}`}
        style={{ fontSize: size, letterSpacing: "-0.03em" }}
      >
        {value}
      </div>
      <div className={`mt-2.5 h-[3px] w-9 rounded-full ${PEAK[peak].rule}`} />
      <div className={`mt-2.5 text-[12.5px] font-medium ${dark ? "text-white/75" : "text-ink-2"}`}>{label}</div>
      {sub && <div className={`mt-0.5 text-[12px] leading-snug ${dark ? "text-white/50" : "text-muted"}`}>{sub}</div>}
    </div>
  );
}

/**
 * A Navy card, which the guidelines allow exactly two decorations on: the
 * ridge along the foot, or the bell cropped into a corner at 8%. One card per
 * screen carries it, because the point of a dark card is that it is the only
 * dark thing on a Paper page.
 */
export function NavyCard({
  children, decoration = "ridge", className = "",
}: {
  children: ReactNode;
  decoration?: "ridge" | "bell" | "none";
  className?: string;
}) {
  return (
    <section className={`relative overflow-hidden rounded-2xl bg-ink p-7 text-white ${className}`}>
      {decoration === "ridge" && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0">
          <Ridge height={54} opacity={0.07} />
        </div>
      )}
      {decoration === "bell" && (
        <img
          aria-hidden src="/brand/bell-white.svg" alt="" width={220} height={220}
          className="pointer-events-none absolute -bottom-14 -right-12 opacity-[0.08]"
        />
      )}
      <div className="relative">{children}</div>
    </section>
  );
}

/**
 * One of the three jobs, as a card. Tile, name, the figure that says how that
 * job is going, a plain reading, and a way into the detail.
 */
export function PeakCard({
  peak, icon, name, children,
}: { peak: Peak; icon: IconName; name: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-6">
      <div className="flex items-center gap-3">
        <TintTile icon={icon} peak={peak} />
        <div className="flex items-center gap-2">
          <Diamond peak={peak} size={10} />
          <h3 className="h-tight text-[16px] text-ink">{name}</h3>
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * A section of detail folded away.
 *
 * The console had eight sections of equal weight and was five and a half
 * screens tall, which meant the figure that decides whether the business
 * works sat in the same visual rank as a table of which free tools people
 * opened. Everything below the summary now opens on request: the first
 * screen answers "is this healthy", and the tables are one press away for
 * the day you need them.
 */
export function Drawer({
  title, note, count, children, open = false,
}: {
  title: string;
  note?: string;
  /** A figure worth seeing without opening the drawer, such as a row count. */
  count?: ReactNode;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details open={open} className="group rounded-2xl border border-line bg-panel">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-6 py-4">
        <Icon
          name="chevron" size={16}
          className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">{title}</span>
          {note && <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{note}</span>}
        </span>
        {count !== undefined && <span className="mono shrink-0 text-[13px] text-muted">{count}</span>}
      </summary>
      <div className="border-t border-line px-6 py-5">{children}</div>
    </details>
  );
}
