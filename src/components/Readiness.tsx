import Link from "next/link";
import type { Readiness } from "@/lib/gamify/readiness";
import type { Achievement } from "@/lib/gamify/achievements";

/**
 * The student's standing, at the top of their dashboard.
 *
 * This is the thing that should bring someone back next week: one honest
 * number, what would move it, and how long they have kept going. Everything
 * here is derived from real progress, so it cannot be farmed.
 */

function Ring({ pct, size = 116 }: { pct: number; size?: number }) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
         aria-label={`Readiness ${clamped} out of 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke="var(--color-line-2)" strokeWidth={stroke} opacity={0.4} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--color-brand-500)" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (clamped / 100) * c}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)" }}
      />
      <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle"
            className="num" fontSize={size * 0.29} fontWeight="700" fill="var(--color-ink)">
        {clamped}
      </text>
      <text x="50%" y="68%" textAnchor="middle" dominantBaseline="middle"
            fontSize={size * 0.093} fontWeight="600" fill="var(--color-muted)"
            letterSpacing="1.1">
        READY
      </text>
    </svg>
  );
}

export function ReadinessPanel({
  readiness, streak, achievements, nextUp,
}: {
  readiness: Readiness;
  streak: { weeks: number; activeThisWeek: boolean };
  achievements: Achievement[];
  nextUp: Achievement | null;
}) {
  const earned = achievements.filter((a) => a.earned).length;

  return (
    <div className="settle overflow-hidden rounded-[22px] border border-line bg-panel">
      <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:gap-7 sm:p-6">
        <div className="mx-auto shrink-0 sm:mx-0">
          <Ring pct={readiness.score} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
              style={{
                background: `var(--color-tint-${readiness.band.tint === "wash" ? "sky" : readiness.band.tint})`,
                color: `var(--color-tint-${readiness.band.tint === "wash" ? "sky" : readiness.band.tint}-ink)`,
              }}
            >
              {readiness.band.label}
            </span>

            {streak.weeks > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-tint-amber px-2.5 py-1 text-[11.5px] font-semibold text-tint-amber-ink"
                title="Weeks in a row you have moved something forward"
              >
                <span aria-hidden>🔥</span>
                {streak.weeks} week{streak.weeks === 1 ? "" : "s"} running
              </span>
            )}

            <span className="text-[11.5px] text-muted">
              {earned} of {achievements.length} milestones
            </span>
          </div>

          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{readiness.band.blurb}</p>

          {readiness.nextBest && (
            <div className="mt-3.5 rounded-2xl border border-brand-200 bg-brand-50 p-3.5">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand-700">
                Worth doing next
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 text-[13.5px] text-ink">{readiness.nextBest.why}</p>
                <Link
                  href={readiness.nextBest.href}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-brand-500 px-4 text-[13px] font-semibold text-white hover:bg-brand-600 sm:min-h-0 sm:py-2"
                >
                  {readiness.nextBest.label} →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* The five things the number is made of, so it is never a mystery. */}
      <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-5">
        {readiness.facets.map((f) => {
          const pct = Math.round((f.points / f.max) * 100);
          return (
            <div key={f.id} className="bg-panel px-3.5 py-3">
              <div className="flex items-center gap-1.5">
                <span aria-hidden className="text-[13px]">{f.icon}</span>
                <span className="truncate text-[11.5px] font-semibold text-ink">{f.label}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line-2/50">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: `var(--color-tint-${f.tint}-ink)`,
                    transition: "width .9s cubic-bezier(.22,1,.36,1)",
                  }}
                />
              </div>
              <div className="num mt-1.5 text-[11px] text-muted">
                {f.points}/{f.max}
              </div>
            </div>
          );
        })}
      </div>

      {nextUp && (
        <div className="flex items-center gap-2.5 border-t border-line bg-wash/60 px-5 py-3">
          <span aria-hidden className="text-[15px] opacity-45">{nextUp.icon}</span>
          <p className="min-w-0 flex-1 text-[12.5px] text-ink-2">
            <span className="font-semibold text-ink">Next milestone — {nextUp.label}:</span>{" "}
            {nextUp.hint}.
          </p>
        </div>
      )}
    </div>
  );
}

/** The full wall, for the dedicated progress page. */
export function AchievementWall({ achievements }: { achievements: Achievement[] }) {
  const phases = ["Decide", "Prepare", "Apply", "Depart"] as const;

  return (
    <div className="flex flex-col gap-6">
      {phases.map((phase) => {
        const items = achievements.filter((a) => a.phase === phase);
        if (items.length === 0) return null;
        const got = items.filter((a) => a.earned).length;

        return (
          <div key={phase}>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="h-tight text-[15px] font-semibold text-ink">{phase}</h3>
              <span className="num text-[11.5px] text-muted">{got}/{items.length}</span>
            </div>

            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((a) => (
                <div
                  key={a.id}
                  className={`flex gap-3 rounded-2xl border p-3.5 ${
                    a.earned
                      ? "border-transparent bg-tint-mint"
                      : "border-line bg-panel"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`text-[19px] leading-none ${a.earned ? "" : "opacity-30 grayscale"}`}
                  >
                    {a.icon}
                  </span>
                  <div className="min-w-0">
                    <div
                      className={`text-[13.5px] font-semibold ${
                        a.earned ? "text-tint-mint-ink" : "text-muted"
                      }`}
                    >
                      {a.label}
                    </div>
                    <p
                      className={`mt-0.5 text-[12px] leading-snug ${
                        a.earned ? "text-tint-mint-ink/80" : "text-muted"
                      }`}
                    >
                      {a.earned ? a.blurb : a.hint}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
