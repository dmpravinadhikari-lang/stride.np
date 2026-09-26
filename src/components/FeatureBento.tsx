import type { ReactNode } from "react";
import { Reveal } from "@/components/Reveal";
import { Icon, type IconName } from "@/components/Icon";

/**
 * What the product does, shown rather than described.
 *
 * The section this replaces was a definition list: twelve names, twelve
 * sentences, no picture of anything. Pravin, reading it: "Features option is
 * also only texts."
 *
 * So each tile carries a small piece of the actual interface, built in markup
 * rather than pasted as a screenshot. It stays sharp at any size, it is
 * readable to a screen reader, it costs no image weight on a Kathmandu
 * connection, and when a stage colour changes in the product it changes here
 * too. The words shrink to a name and one line, because the picture is now
 * doing the explaining.
 *
 * The movement is a loop of three or four seconds on one element per tile,
 * never on all of them at once, and it stops entirely for anybody who has
 * asked their device for less motion.
 */

function Tile({
  eyebrow, title, line, children, className = "", tone = "light", delay = 0,
}: {
  eyebrow: string;
  title: string;
  line: string;
  children: ReactNode;
  className?: string;
  tone?: "light" | "dark" | "brand";
  delay?: number;
}) {
  const skin =
    tone === "dark"
      ? "border-white/10 bg-ink text-white"
      : tone === "brand"
        ? "border-brand-700/20 bg-brand-900 text-white"
        : "border-line bg-panel text-ink";

  return (
    <Reveal delay={delay} className={className}>
      <article
        className={`group relative flex h-full flex-col overflow-hidden rounded-[20px] border transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(4,30,73,.45)] ${skin}`}
      >
        <div className="relative min-h-[164px] flex-1 overflow-hidden px-5 pt-5">{children}</div>
        <div className="px-5 pb-5 pt-4">
          <div className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${tone === "light" ? "text-brand-600" : "text-brand-200"}`}>
            {eyebrow}
          </div>
          <h3 className={`mt-1.5 text-[17px] font-semibold leading-tight ${tone === "light" ? "text-ink" : "text-white"}`}>
            {title}
          </h3>
          <p className={`mt-1 text-[13.5px] leading-snug ${tone === "light" ? "text-muted" : "text-white/60"}`}>
            {line}
          </p>
        </div>
      </article>
    </Reveal>
  );
}

/* --------------------------------------------------------- the small parts */

const Row = ({
  name, note, tone, chip, className = "",
}: { name: string; note: string; tone: string; chip: string; className?: string }) => (
  <div className={`flex items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-2 ${className}`}>
    <span className={`h-7 w-7 shrink-0 rounded-full ${tone}`} aria-hidden />
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[12.5px] font-semibold text-ink">{name}</span>
      <span className="block truncate text-[11px] text-muted">{note}</span>
    </span>
    <span className="shrink-0 rounded-full bg-wash px-2 py-0.5 text-[10.5px] font-semibold text-ink-2">{chip}</span>
  </div>
);

const Bar = ({ h, tone, delay }: { h: number; tone: string; delay: number }) => (
  <span
    className={`w-full origin-bottom rounded-t-[4px] ${tone} motion-safe:animate-[growUp_4.2s_ease-in-out_infinite]`}
    style={{ height: `${h}%`, animationDelay: `${delay}ms` }}
    aria-hidden
  />
);

export function FeatureBento() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* ------------------------------------------------- the board, wide */}
      <Tile
        eyebrow="The board"
        title="Every student, one row each"
        line="Stage, counsellor, next step, and whether it is late."
        className="lg:col-span-2"
      >
        <div className="flex flex-col gap-2">
          <Row name="Sujata Gurung" note="Australia, Masters" tone="bg-tint-sky" chip="Applying" />
          <Row name="Bibek Thapa" note="UK, Bachelors" tone="bg-tint-mint" chip="Offer" />
          {/* The new enquiry arriving, which is what the board does all day. */}
          <Row
            name="Niraj Shrestha" note="Walk-in, two minutes ago" tone="bg-tint-amber" chip="New"
            className="motion-safe:animate-[ringPulseGold_3.8s_ease-in-out_infinite]"
          />
          <div className="h-8 rounded-xl border border-dashed border-line-2" aria-hidden />
        </div>
      </Tile>

      {/* -------------------------------------------------------- the clock */}
      <Tile eyebrow="Attendance" title="Clock in from the office" line="Inside a radius you set. Away days carry a reason." delay={80}>
        <div className="relative grid h-[150px] place-items-center">
          <span className="absolute h-28 w-28 rounded-full border border-brand-200" aria-hidden />
          <span
            className="absolute h-28 w-28 rounded-full bg-brand-500/10 motion-safe:animate-[pulseDot_3.4s_ease-in-out_infinite]"
            aria-hidden
          />
          <span className="relative grid h-16 w-16 place-items-center rounded-full bg-brand-600 text-white shadow-lg">
            <Icon name="clock" size={26} />
          </span>
          <span className="absolute bottom-1 rounded-full border border-line bg-white px-3 py-1 text-[11.5px] font-semibold text-teal-700">
            Clocked in, 09:02
          </span>
        </div>
      </Tile>

      {/* ----------------------------------------------------- the documents */}
      <Tile eyebrow="Documents" title="Verified, or sent back with a reason" line="Sealed on disk. Sensitive papers expire on their own." delay={40}>
        <ul className="flex flex-col gap-2">
          {[
            { name: "Passport", state: "Verified", tone: "bg-teal-100 text-teal-700", icon: "check" as IconName },
            { name: "Bank letter", state: "Waiting", tone: "bg-gold-100 text-gold-600", icon: "clock" as IconName },
            { name: "Transcript", state: "Sent back", tone: "bg-danger-100 text-danger-600", icon: "alert" as IconName },
          ].map((d, i) => (
            <li key={d.name} className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-2">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${d.tone} ${
                  i === 0 ? "motion-safe:animate-[ringPulseTeal_4s_ease-in-out_infinite]" : ""
                }`}
              >
                <Icon name={d.icon} size={14} />
              </span>
              <span className="flex-1 truncate text-[12.5px] font-medium text-ink">{d.name}</span>
              {/* The state is always legible; only the tick beside it breathes. */}
              <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${d.tone}`}>
                {d.state}
              </span>
            </li>
          ))}
        </ul>
      </Tile>

      {/* ------------------------------------------------------- the reports */}
      <Tile
        eyebrow="Monday morning"
        title="Five offices, side by side"
        line="Every number opens the list behind it."
        tone="dark"
        delay={80}
      >
        <div className="flex h-[150px] items-end gap-2.5 pb-2">
          {[
            { city: "Ktm", h: 92, tone: "bg-brand-400" },
            { city: "Pkr", h: 64, tone: "bg-brand-300" },
            { city: "Btl", h: 48, tone: "bg-accent-300" },
            { city: "Chw", h: 71, tone: "bg-brand-300" },
            { city: "Bir", h: 36, tone: "bg-white/30" },
          ].map((b, i) => (
            <span key={b.city} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="flex h-full w-full items-end">
                <Bar h={b.h} tone={b.tone} delay={i * 220} />
              </span>
              <span className="text-[10px] text-white/50">{b.city}</span>
            </span>
          ))}
        </div>
      </Tile>

      {/* -------------------------------------------------------- the market */}
      <Tile eyebrow="Outside your office" title="What the market is doing" line="Search demand, dated rule changes, the intake calendar." delay={40}>
        <ul className="flex flex-col gap-2.5">
          {[
            { place: "Australia", pct: 78, tone: "bg-tint-sky-ink" },
            { place: "United Kingdom", pct: 61, tone: "bg-tint-lilac-ink" },
            { place: "Japan", pct: 44, tone: "bg-tint-mint-ink" },
            { place: "Canada", pct: 29, tone: "bg-tint-amber-ink" },
          ].map((m, i) => (
            <li key={m.place}>
              <div className="flex items-baseline justify-between text-[11.5px]">
                <span className="font-medium text-ink-2">{m.place}</span>
                <span className="tabular-nums text-muted">{m.pct}</span>
              </div>
              <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-wash">
                <span
                  className={`block h-full rounded-full ${m.tone} origin-left motion-safe:animate-[sweepIn_4.4s_ease-in-out_infinite]`}
                  style={{ width: `${m.pct}%`, animationDelay: `${i * 180}ms` }}
                />
              </span>
            </li>
          ))}
        </ul>
      </Tile>

      {/* ------------------------------------------------------- the payroll */}
      <Tile eyebrow="The office" title="Payroll in the Nepali month" line="Reads the days actually clocked. SSF, PF, TDS, CIT." delay={80}>
        <div className="rounded-xl border border-line bg-white p-3.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">Asoj 2082</span>
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10.5px] font-semibold text-teal-700">Paid</span>
          </div>
          <dl className="mt-2.5 flex flex-col gap-1.5 text-[12px]">
            {[["Days clocked", "24 of 26"], ["SSF", "NPR 3,100"], ["TDS", "NPR 1,450"]].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-line pb-1.5 last:border-0">
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium tabular-nums text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-[12px] font-semibold text-ink">Net</span>
            <span className="num text-[16px] font-semibold text-ink">NPR 61,450</span>
          </div>
        </div>
      </Tile>

      {/* ------------------------------------------------ the student tools */}
      <Tile
        eyebrow="For your students"
        title="IELTS and PTE mocks, marked"
        line="Practice inside your consultancy, under your name."
        tone="brand"
        className="lg:col-span-2"
        delay={40}
      >
        <div className="grid h-full grid-cols-[auto_minmax(0,1fr)] items-center gap-5">
          <div className="relative grid h-[120px] w-[120px] place-items-center">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="52" fill="none" stroke="#FBBC04" strokeWidth="10" strokeLinecap="round"
                strokeDasharray="327" strokeDashoffset="72"
                className="motion-safe:animate-[ringFill_4.6s_ease-in-out_infinite]"
              />
            </svg>
            <span className="absolute text-center">
              <span className="block num text-[26px] font-semibold leading-none text-white">7.0</span>
              <span className="block text-[10.5px] uppercase tracking-wide text-brand-200">Band</span>
            </span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {[["Listening", "7.5"], ["Reading", "7.0"], ["Writing", "6.5"], ["Speaking", "7.0"]].map(([skill, band]) => (
              <li key={skill} className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-1.5">
                <span className="text-[12.5px] text-white/80">{skill}</span>
                <span className="num text-[13px] font-semibold text-white">{band}</span>
              </li>
            ))}
          </ul>
        </div>
      </Tile>
    </div>
  );
}
