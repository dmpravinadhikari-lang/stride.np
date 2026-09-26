import { Icon } from "@/components/Icon";
import type { Badge, Scorecard } from "@/modules/account/scorecard";

/**
 * Your month, on your own account page.
 *
 * Three things make this a scorecard rather than a table of counts: the
 * fortnight strip, which shows the shape of a run and where it broke; the
 * badges, which have three rungs each so there is always a next one; and last
 * month, which is the only thing anybody here is asked to beat.
 *
 * Colour carries meaning throughout. A day worked is filled, a day the office
 * was shut is hollow and cannot break anything, and each badge keeps its own
 * hue so the row is read as six things rather than one list.
 *
 * Only ever your own numbers. Nobody is ranked against anybody.
 */
export function ScoreCard({
  card, name, office,
}: {
  card: Scorecard;
  name: string;
  /** The whole office's month, shown only to whoever runs it. */
  office?: { name: string; newLeads: number; leadsWon: number } | null;
}) {
  const pct = Math.min(100, Math.round((card.level.into / card.level.span) * 100));
  const ahead = card.points - card.lastMonthPoints;

  const figures = [
    { label: "Enquiries won", value: card.leadsWon, ink: "text-tint-sky-ink", bar: "bg-tint-sky-ink" },
    { label: "Students moved on", value: card.moved, ink: "text-tint-lilac-ink", bar: "bg-tint-lilac-ink" },
    { label: "Tasks finished", value: card.tasksDone, ink: "text-tint-amber-ink", bar: "bg-tint-amber-ink" },
    { label: "Days in", value: card.daysIn, ink: "text-tint-mint-ink", bar: "bg-tint-mint-ink" },
  ];

  // The tallest day in the strip sets the height of the rest, so a quiet
  // fortnight is not drawn as a flat line.
  const peak = Math.max(1, ...card.fortnight.map((d) => d.points));

  /*
   * The one within reach.
   *
   * Six meters all part-filled is a list, not a goal. The badge nearest its
   * next rung is named, so there is always one obvious thing to go and do
   * this afternoon rather than six vague ones.
   */
  const closest = card.badges
    .filter((b) => b.next !== null)
    .sort((a, b) => (a.next! - a.got) - (b.next! - b.got))[0] ?? null;

  return (
    <section className="settle overflow-hidden rounded-2xl border border-line bg-panel">
      {/* The one band of strong colour in the console, and it belongs to the
          person rather than to a number the office watches. */}
      <div className="relative overflow-hidden bg-brand-900 px-5 py-5 text-white">
        <span
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-500/30 blur-2xl"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-accent-500/20 blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-brand-200">
              {name.split(" ")[0]}, in {card.month}
            </div>
            <h2 className="display mt-1.5 text-[26px] leading-tight">{card.level.label}</h2>
            <p className="mt-1 text-[13px] text-brand-100">
              Level {card.level.n} · {card.points} points this month
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ${
              card.streak > 0 ? "bg-accent-500 text-ink" : "bg-white/15 text-white"
            }`}>
              <Icon name="flame" size={15} />
              {card.streak > 0 ? `${card.streak} day${card.streak === 1 ? "" : "s"} in a row` : "Streak broken"}
            </span>
            <span className="text-[11.5px] text-brand-100">
              {card.bestStreak > card.streak ? `Your best is ${card.bestStreak}` : "Your best run yet"}
            </span>
          </div>
        </div>
        <div className="relative mt-4">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-white/20"
            role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
            aria-label="Progress to the next level"
          >
            <div className="h-full rounded-full bg-accent-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[12px] text-brand-100">
            <span>{card.level.into} of {card.level.span} points towards level {card.level.n + 1}</span>
            <span aria-hidden className="text-brand-200">·</span>
            {/* Last month, which is the only competitor anybody is given. */}
            <span className={ahead >= 0 ? "font-semibold text-accent-300" : ""}>
              {card.lastMonthPoints === 0
                ? "Your first month counted"
                : ahead >= 0
                  ? `${ahead} ahead of last month`
                  : `${-ahead} behind last month (${card.lastMonthPoints})`}
            </span>
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------ the fortnight */}
      <div className="border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
            Your last fortnight
          </h3>
          <span className="text-[11.5px] text-muted">Taller means a busier day. Days off never break a run.</span>
        </div>
        <ol className="mt-3 flex items-end gap-1.5">
          {card.fortnight.map((d) => {
            // Every day gets the same track, and the fill inside it says how
            // the day went. Bars drawn at their own height alone made a quiet
            // fortnight look like a row of identical pills.
            // A worked day never draws as an empty track: the floor is a quarter.
            const fill = d.points > 0 ? Math.max(25, Math.round((d.points / peak) * 100)) : 0;
            const title = `${d.initial} ${d.day.slice(8)}: ${
              d.off ? d.offName ?? "Office shut" : d.worked ? `${d.points} points` : "Not in"
            }`;
            return (
              <li key={d.day} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <span
                  title={title}
                  className={`flex h-14 w-full items-end overflow-hidden rounded-lg ${
                    d.off
                      ? "border border-dashed border-line-2 bg-transparent"
                      : d.worked ? "bg-wash" : "bg-danger-100"
                  } ${d.today ? "ring-2 ring-brand-500 ring-offset-1" : ""}`}
                >
                  {d.worked && (
                    <span
                      className={`w-full rounded-lg ${d.points > 0 ? "bg-brand-500" : "bg-brand-200"}`}
                      style={{ height: `${fill || 14}%` }}
                    />
                  )}
                </span>
                <span className={`text-[10.5px] ${d.today ? "font-semibold text-ink" : "text-muted"}`}>
                  {d.initial.slice(0, 2)}
                </span>
                <span className="sr-only">{title}</span>
              </li>
            );
          })}
        </ol>
        <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-muted">
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-brand-500" aria-hidden /> Worked
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-brand-200" aria-hidden /> In, nothing logged
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-dashed border-line-2" aria-hidden /> Office shut
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-danger-100" aria-hidden /> Not in
          </li>
        </ul>
      </div>

      <div className="grid grid-cols-2 divide-line border-b border-line sm:grid-cols-4 sm:divide-x">
        {figures.map((f) => (
          <div key={f.label} className="relative px-4 py-3.5">
            <span className={`absolute inset-x-4 top-0 h-[3px] rounded-b ${f.bar}`} aria-hidden />
            <div className={`num text-[26px] font-semibold leading-none ${f.ink}`}>{f.value}</div>
            <div className="mt-1 text-[12px] text-muted">{f.label}</div>
          </div>
        ))}
      </div>

      <div className="px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">Badges</h3>
          <span className="text-[11.5px] text-muted">
            {card.badges.filter((b) => b.tier > 0).length} of {card.badges.length} started · three rungs each
          </span>
        </div>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {card.badges.map((b) => <BadgeTile key={b.id} b={b} closest={b.id === closest?.id} />)}
        </ul>

        {office && (
          /*
           * The office's own month, under everybody's badges.
           *
           * It is a total and never a list of names. An owner who wants to
           * know who did what opens Reports, where it is presented as work.
           * Here it is the one number the whole floor shares, which is the
           * only kind of competition this card allows.
           */
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-line bg-wash/60 px-4 py-3">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
              {office.name}, this month
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="num text-[18px] font-semibold text-ink">{office.newLeads}</span>
              <span className="text-[12.5px] text-muted">enquiries in</span>
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="num text-[18px] font-semibold text-teal-700">{office.leadsWon}</span>
              <span className="text-[12.5px] text-muted">
                became {office.leadsWon === 1 ? "a student" : "students"}
              </span>
            </span>
            <span className="text-[12px] text-muted">The whole office, not one desk.</span>
          </div>
        )}
      </div>
    </section>
  );
}

const ROMAN = ["", "I", "II", "III"];

function BadgeTile({ b, closest = false }: { b: Badge; closest?: boolean }) {
  const done = b.tier === 3;
  const started = b.tier > 0;
  // Progress runs between the rung just passed and the one being climbed, so
  // the meter fills three times rather than crawling once.
  const floor = b.tier === 0 ? 0 : b.steps[b.tier - 1];
  const pct = b.next === null ? 100 : Math.min(100, Math.round(((b.got - floor) / (b.next - floor)) * 100));

  return (
    <li
      className={`relative flex items-center gap-3 rounded-2xl border px-3.5 py-3 ${
        started ? `border-transparent ${b.tint}` : "border-line bg-panel"
      } ${closest ? "ring-2 ring-brand-400 ring-offset-2" : ""}`}
    >
      <span className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full ${started ? "bg-white" : b.tint} ${b.ink}`}>
        <Icon name={done ? "trophy" : b.icon} size={18} />
        {started && (
          <span className={`absolute -bottom-1 rounded-full px-1.5 text-[9.5px] font-bold text-white ${b.fill}`}>
            {ROMAN[b.tier]}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className={`truncate text-[13.5px] font-semibold ${started ? b.ink : "text-ink"}`}>{b.label}</span>
            {closest && (
              <span className="shrink-0 rounded-full bg-brand-600 px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wide text-white">
                Nearest
              </span>
            )}
          </span>
          <span className="shrink-0 tabular-nums text-[11.5px] text-muted">
            {b.next === null ? "All three" : `${b.got} / ${b.next}`}
          </span>
        </span>
        <span className="block truncate text-[12px] text-muted">{b.how}</span>
        <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-white/70">
          <span className={`block h-full rounded-full ${b.fill}`} style={{ width: `${pct}%` }} />
        </span>
        <span className="mt-1 block text-[11.5px] text-muted">
          {b.next === null
            ? "Nothing left to climb here."
            : b.tier === 0
              ? `${b.next - b.got} to go for the first rung`
              : `${b.next - b.got} more for ${ROMAN[(b.tier + 1) as 1 | 2 | 3]}`}
        </span>
      </span>
    </li>
  );
}
