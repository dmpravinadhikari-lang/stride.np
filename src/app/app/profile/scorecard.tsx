import { Icon } from "@/components/Icon";
import type { Scorecard } from "@/modules/account/scorecard";

/**
 * Your month, on your own account page.
 *
 * It is drawn as a card of colour rather than a table of counts on purpose:
 * this is the one screen in the console that is about the person using it,
 * and it should not look like the reports. Each badge says what it takes in
 * the same line as how far along you are, so nothing is a secret and nothing
 * needs explaining by a manager.
 *
 * Only ever your own numbers. Nobody is ranked against anybody here.
 */
export function ScoreCard({ card, name }: { card: Scorecard; name: string }) {
  const pct = Math.min(100, Math.round((card.level.into / card.level.span) * 100));

  const figures = [
    { label: "Enquiries won", value: card.leadsWon, ink: "text-tint-sky-ink", bar: "bg-tint-sky-ink" },
    { label: "Students moved on", value: card.moved, ink: "text-tint-lilac-ink", bar: "bg-tint-lilac-ink" },
    { label: "Tasks finished", value: card.tasksDone, ink: "text-tint-amber-ink", bar: "bg-tint-amber-ink" },
    { label: "Days in", value: card.daysIn, ink: "text-tint-mint-ink", bar: "bg-tint-mint-ink" },
  ];

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
          {card.streak > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-semibold">
              <Icon name="flame" size={15} className="text-accent-300" />
              {card.streak} day{card.streak === 1 ? "" : "s"} in a row
            </span>
          )}
        </div>
        <div className="relative mt-4">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-white/20"
            role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
            aria-label="Progress to the next level"
          >
            <div className="h-full rounded-full bg-accent-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-[12px] text-brand-100">
            {card.level.into} of {card.level.span} points towards level {card.level.n + 1}
          </p>
        </div>
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
        <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">Badges</h3>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {card.badges.map((b) => {
            const done = b.got >= b.need;
            const pctB = Math.min(100, Math.round((b.got / b.need) * 100));
            return (
              <li
                key={b.id}
                className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 ${
                  done ? `border-transparent ${b.tint}` : "border-line bg-panel"
                }`}
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${done ? "bg-white" : b.tint} ${b.ink}`}>
                  <Icon name={done ? "check" : b.icon} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13.5px] font-semibold ${done ? b.ink : "text-ink"}`}>
                    {b.label}
                    {done && <span className="ml-1.5 text-[11.5px] font-medium">Earned</span>}
                  </span>
                  <span className="block truncate text-[12px] text-muted">{b.how}</span>
                  {!done && (
                    <span className="mt-1.5 block">
                      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-wash">
                        <span className={`block h-full rounded-full ${b.fill}`} style={{ width: `${pctB}%` }} />
                      </span>
                      <span className="mt-1 block text-[11.5px] tabular-nums text-muted">{b.got} of {b.need}</span>
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
