"use client";

/**
 * The hero illustration: the journey as a checklist that fills itself in.
 *
 * Line art in the Khalti manner rather than a stock photograph, and it says
 * something true — the whole product is a list of dated things that get ticked
 * off. Pure CSS and SVG, no library, and it stops entirely under
 * prefers-reduced-motion.
 */
const ROWS = [
  { label: "Work out the real cost", tint: "var(--color-tint-sky)", delay: 0 },
  { label: "Check they qualify", tint: "var(--color-tint-mint)", delay: 0.5 },
  { label: "Sort the loan", tint: "var(--color-tint-amber)", delay: 1.0 },
  { label: "Collect the documents", tint: "var(--color-tint-lilac)", delay: 1.5 },
  { label: "Pass the interview", tint: "var(--color-tint-rose)", delay: 2.0 },
];

export function PlanArt() {
  return (
    <div className="relative select-none" aria-hidden>
      <style>{`
        @keyframes stride-tick { 0%,8% { opacity:0; transform:scale(.5);} 18%,100% { opacity:1; transform:scale(1);} }
        @keyframes stride-fill { 0%,8% { width:0; } 22%,100% { width:100%; } }
        @keyframes stride-rise { from { opacity:0; transform:translateY(10px);} to { opacity:1; transform:translateY(0);} }
        @keyframes stride-float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-9px) } }
        .stride-row { animation: stride-rise .6s ease-out both; }
        .stride-check { animation: stride-tick 7s ease-in-out infinite; }
        .stride-bar { animation: stride-fill 7s ease-in-out infinite; }
        .stride-badge { animation: stride-float 5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .stride-row, .stride-check, .stride-bar, .stride-badge { animation: none !important; }
          .stride-bar { width: 100% !important; }
        }
      `}</style>

      {/* Floating accents. These carry no meaning — unlike the row tints, which
          say which tool a step belongs to — so they take the brand's own pale
          cyan rather than borrowing a category colour. */}
      <div className="stride-badge absolute -left-5 -top-4 hidden h-14 w-14 rounded-full bg-brand-100 sm:block" />
      <div className="stride-badge absolute -bottom-5 -right-3 hidden h-10 w-10 rounded-full bg-brand-200 sm:block"
        style={{ animationDelay: "1.6s" }} />

      <div className="relative rounded-[24px] border border-line bg-panel p-5 shadow-[0_20px_50px_-30px_rgba(0,22,25,.45)]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted">Student file</span>
          <span className="rounded-full bg-tint-mint px-2.5 py-1 text-[10.5px] font-semibold text-tint-mint-ink">
            July 2027 intake
          </span>
        </div>

        <ul className="mt-4 flex flex-col gap-3">
          {ROWS.map((r, i) => (
            <li key={r.label} className="stride-row flex items-center gap-3" style={{ animationDelay: `${i * 0.09}s` }}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: r.tint }}>
                <svg width="14" height="14" viewBox="0 0 14 14" className="stride-check"
                  style={{ animationDelay: `${r.delay}s` }}>
                  <path d="M2.5 7.5 L5.5 10.5 L11.5 3.5" fill="none" stroke="var(--color-brand-600)"
                    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-ink">{r.label}</span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-wash">
                  <span className="stride-bar block h-full rounded-full"
                    style={{ background: "var(--color-brand-400)", animationDelay: `${r.delay}s` }} />
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
          <span className="text-[12px] text-muted">Every step dated back from the intake</span>
          <span className="num text-[12px] font-semibold text-brand-600">30 steps</span>
        </div>
      </div>
    </div>
  );
}
