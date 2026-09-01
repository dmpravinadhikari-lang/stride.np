import { VERDICT_STYLE, trendIsGood, type Metric } from "@/lib/analytics/metric";

/**
 * One number, with everything needed to act on it.
 *
 * The layout is deliberate: the figure is large, but the sentence under it is
 * the part that does the work. A reader who knows what "activation" means can
 * take the number and move on; a reader who does not gets told, in the same
 * glance, what it measures and whether it is a problem.
 *
 * The "what to do" line only appears when there is something to do. A card
 * that always ends in advice trains people to stop reading the advice.
 */
export function MetricCard({ metric }: { metric: Metric }) {
  const style = VERDICT_STYLE[metric.verdict];
  const good = trendIsGood(metric.trend);

  return (
    <div className="settle flex h-full flex-col rounded-[20px] border border-line bg-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[12.5px] font-semibold text-ink-2">{metric.label}</span>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
          style={{
            background: `var(--color-tint-${style.tint})`,
            color: `var(--color-tint-${style.tint}-ink)`,
          }}
        >
          {style.word}
        </span>
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="num text-[32px] font-bold leading-none text-ink">{metric.display}</span>
        {metric.trend && metric.trend.direction !== "flat" && (
          <span
            className="text-[12px] font-semibold"
            style={{
              color: good === null
                ? "var(--color-muted)"
                : good
                  ? "var(--color-tint-mint-ink)"
                  : "var(--color-tint-rose-ink)",
            }}
            title="Against the previous period of the same length"
          >
            {metric.trend.direction === "up" ? "↑" : "↓"} {metric.trend.pct}%
          </span>
        )}
      </div>

      {metric.basis && (
        <div className="mt-1 text-[11.5px] text-muted">{metric.basis}</div>
      )}

      <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">{metric.meaning}</p>

      {metric.action && (
        <p
          className="mt-auto pt-3 text-[12.5px] leading-relaxed"
          style={{ color: `var(--color-tint-${style.tint}-ink)` }}
        >
          <span className="font-semibold">What to do:</span> {metric.action}
        </p>
      )}
    </div>
  );
}

/** A row of them, with a heading that says what the reader is looking at. */
export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((m) => (
        <MetricCard key={m.id} metric={m} />
      ))}
    </div>
  );
}
