/**
 * An animated mark for each free tool.
 *
 * These replace a row of emoji in tinted squares, where the only thing telling
 * one card from the next was the glyph. Each of these instead *performs* what
 * its tool does. The cost mark stacks up money, the eligibility mark swings a
 * needle to a verdict, the loan mark pays a balance down. A visitor can tell
 * the cards apart at a glance, before reading a word.
 *
 * Built as inline SVG with CSS animation rather than Lottie or GIFs: no
 * library, no image weight, sharp at any size, and each one follows the theme.
 * Every animation is wrapped in `motion-safe:` so a person who has asked their
 * device to stop animating gets a clean static mark instead.
 */

type MarkProps = {
  tint: string;
  /**
   * "tint" sits on a white card and supplies its own colour.
   * "white" sits on a card that is already tinted, where a tinted frame would
   * simply vanish into the background.
   */
  surface?: "tint" | "white";
  size?: "sm" | "lg";
};

function Frame({
  tint, surface = "tint", size = "sm", children,
}: MarkProps & { children: React.ReactNode }) {
  const box = size === "lg" ? "h-[68px] w-[68px] rounded-[20px]" : "h-[52px] w-[52px] rounded-2xl";
  return (
    <div
      className={`${box} relative grid shrink-0 place-items-center overflow-hidden`}
      style={{
        background: surface === "white" ? "rgba(255,255,255,.72)" : `var(--color-tint-${tint})`,
      }}
      aria-hidden
    >
      {children}
    </div>
  );
}

/** The drawing area scales with the frame. */
const glyph = (size: MarkProps["size"]) => (size === "lg" ? "h-10 w-10" : "h-8 w-8");

/** Eligibility, a needle swings across a dial and settles on a tick. */
export function EligibilityMark({ tint, surface, size }: MarkProps) {
  const ink = `var(--color-tint-${tint}-ink)`;
  return (
    <Frame tint={tint} surface={surface} size={size}>
      <svg viewBox="0 0 40 40" className={glyph(size)}>
        <path d="M7 27 A 13 13 0 0 1 33 27" fill="none" stroke={ink} strokeWidth="3"
              strokeLinecap="round" opacity=".28" />
        <g className="motion-safe:animate-[swing_2.8s_ease-in-out_infinite]" style={{ transformOrigin: "20px 27px" }}>
          <line x1="20" y1="27" x2="20" y2="14" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <circle cx="20" cy="27" r="2.6" fill={ink} />
      </svg>
    </Frame>
  );
}

/** Cost, three bars stack up, the way a total builds. */
export function CostMark({ tint, surface, size }: MarkProps) {
  const ink = `var(--color-tint-${tint}-ink)`;
  return (
    <Frame tint={tint} surface={surface} size={size}>
      <svg viewBox="0 0 40 40" className={glyph(size)}>
        {[
          { x: 8, h: 11, d: "0s" },
          { x: 16.5, h: 18, d: ".18s" },
          { x: 25, h: 25, d: ".36s" },
        ].map((b) => (
          <rect
            key={b.x} x={b.x} y={32 - b.h} width="7" height={b.h} rx="2" fill={ink}
            className="motion-safe:animate-[growUp_2.6s_cubic-bezier(.22,1,.36,1)_infinite]"
            style={{ transformOrigin: "center 32px", animationDelay: b.d }}
          />
        ))}
      </svg>
    </Frame>
  );
}

/** Loan, a balance line steps down towards zero. */
export function LoanMark({ tint, surface, size }: MarkProps) {
  const ink = `var(--color-tint-${tint}-ink)`;
  return (
    <Frame tint={tint} surface={surface} size={size}>
      <svg viewBox="0 0 40 40" className={glyph(size)}>
        <line x1="7" y1="31" x2="33" y2="31" stroke={ink} strokeWidth="2" opacity=".3" strokeLinecap="round" />
        <path
          d="M8 12 L15 17 L22 22 L29 30" fill="none" stroke={ink} strokeWidth="2.8"
          strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} strokeDasharray={1}
          className="motion-safe:animate-[draw_2.8s_ease-in-out_infinite]"
        />
        <circle cx="29" cy="30" r="2.6" fill={ink}
                className="motion-safe:animate-[popIn_2.8s_ease-in-out_infinite]" />
      </svg>
    </Frame>
  );
}

/** University finder, a lens sweeps across a field of options. */
export function FinderMark({ tint, surface, size }: MarkProps) {
  const ink = `var(--color-tint-${tint}-ink)`;
  return (
    <Frame tint={tint} surface={surface} size={size}>
      <svg viewBox="0 0 40 40" className={glyph(size)}>
        {[[11, 13], [20, 11], [29, 15], [13, 24], [23, 26], [31, 25]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="2.4" fill={ink} opacity=".32" />
        ))}
        <g className="motion-safe:animate-[sweep_3.2s_ease-in-out_infinite]">
          <circle cx="16" cy="18" r="8" fill="none" stroke={ink} strokeWidth="2.6" />
          <line x1="22" y1="24" x2="28" y2="30" stroke={ink} strokeWidth="2.8" strokeLinecap="round" />
        </g>
      </svg>
    </Frame>
  );
}

/** Scholarships, a coin lands, then a second. */
export function ScholarshipMark({ tint, surface, size }: MarkProps) {
  const ink = `var(--color-tint-${tint}-ink)`;
  return (
    <Frame tint={tint} surface={surface} size={size}>
      <svg viewBox="0 0 40 40" className={glyph(size)}>
        <ellipse cx="20" cy="29" rx="10" ry="3.4" fill={ink} opacity=".28" />
        <g className="motion-safe:animate-[drop_2.6s_cubic-bezier(.34,1.4,.64,1)_infinite]">
          <circle cx="20" cy="19" r="7.5" fill="none" stroke={ink} strokeWidth="2.8" />
          <path d="M20 15 v8 M17.6 17 h4.8 M17.6 21 h4.8" stroke={ink} strokeWidth="1.9" strokeLinecap="round" />
        </g>
      </svg>
    </Frame>
  );
}

/** Timeline, a run of dates fills in, left to right. */
export function TimelineMark({ tint, surface, size }: MarkProps) {
  const ink = `var(--color-tint-${tint}-ink)`;
  return (
    <Frame tint={tint} surface={surface} size={size}>
      <svg viewBox="0 0 40 40" className={glyph(size)}>
        <line x1="8" y1="20" x2="32" y2="20" stroke={ink} strokeWidth="2" opacity=".3" strokeLinecap="round" />
        {[10, 20, 30].map((cx, i) => (
          <circle
            key={cx} cx={cx} cy="20" r="3.6" fill={ink}
            className="motion-safe:animate-[pulseDot_2.4s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </svg>
    </Frame>
  );
}

/** Compare, two columns trade places. */
export function CompareMark({ tint, surface, size }: MarkProps) {
  const ink = `var(--color-tint-${tint}-ink)`;
  return (
    <Frame tint={tint} surface={surface} size={size}>
      <svg viewBox="0 0 40 40" className={glyph(size)}>
        <rect x="10" y="14" width="7.5" height="18" rx="2.4" fill={ink}
              className="motion-safe:animate-[seesawA_3s_ease-in-out_infinite]"
              style={{ transformOrigin: "center 32px" }} />
        <rect x="22.5" y="14" width="7.5" height="18" rx="2.4" fill={ink} opacity=".55"
              className="motion-safe:animate-[seesawB_3s_ease-in-out_infinite]"
              style={{ transformOrigin: "center 32px" }} />
      </svg>
    </Frame>
  );
}

/** Documents, boxes tick themselves off in turn. */
export function DocsMark({ tint, surface, size }: MarkProps) {
  const ink = `var(--color-tint-${tint}-ink)`;
  return (
    <Frame tint={tint} surface={surface} size={size}>
      <svg viewBox="0 0 40 40" className={glyph(size)}>
        {[11, 20, 29].map((y, i) => (
          <g key={y}>
            <rect x="9" y={y - 4} width="8" height="8" rx="2.2" fill="none" stroke={ink} strokeWidth="2" opacity=".45" />
            <path
              d={`M10.8 ${y} l2.1 2.2 l4.2 -4.6`} fill="none" stroke={ink} strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"
              pathLength={1} strokeDasharray={1}
              className="motion-safe:animate-[draw_3s_ease-in-out_infinite]"
              style={{ animationDelay: `${i * 0.35}s` }}
            />
            <line x1="21" y1={y} x2="31" y2={y} stroke={ink} strokeWidth="2" strokeLinecap="round" opacity=".32" />
          </g>
        ))}
      </svg>
    </Frame>
  );
}

/** CV maker: lines of a page settle into place. */
export function CvMark({ tint, surface, size }: MarkProps) {
  const ink = `var(--color-tint-${tint}-ink)`;
  return (
    <Frame tint={tint} surface={surface} size={size}>
      <svg viewBox="0 0 40 40" className={glyph(size)}>
        <rect x="10" y="6" width="20" height="28" rx="2.6" fill="none" stroke={ink} strokeWidth="2.4" />
        {[13, 18, 23, 28].map((y, i) => (
          <line
            key={y} x1="14" y1={y} x2={i === 0 ? 22 : i === 3 ? 21 : 26} y2={y}
            stroke={ink} strokeWidth="2" strokeLinecap="round"
            pathLength={1} strokeDasharray={1}
            className="motion-safe:animate-[draw_3s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 0.22}s` }}
          />
        ))}
      </svg>
    </Frame>
  );
}

/** Lookup by tool href, so the card list stays declarative. */
export const TOOL_MARKS: Record<string, (p: MarkProps) => React.ReactElement> = {
  "/tools/eligibility": EligibilityMark,
  "/tools/cost": CostMark,
  "/tools/loan": LoanMark,
  "/tools/universities": FinderMark,
  "/tools/scholarships": ScholarshipMark,
  "/tools/checklist": TimelineMark,
  "/tools/compare": CompareMark,
  "/tools/document-checklist": DocsMark,
  "/tools/cv-maker": CvMark,
};
