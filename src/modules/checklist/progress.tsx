import Link from "next/link";
import { PHASES } from "@/modules/checklist/steps";
import type { Scheduled } from "@/modules/checklist/schedule";
import { Card, Chip } from "@/components/ui";

/** A ring rather than a bar, because it reads as an achievement. */
export function ProgressRing({ pct, size = 132 }: { pct: number; size?: number }) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const stroke =
    clamped >= 100 ? "var(--color-teal-500)"
    : clamped >= 50 ? "var(--color-brand-500)"
    : "var(--color-brand-400)";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
      aria-label={`${Math.round(clamped)} per cent complete`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth="11" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke} strokeWidth="11"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * clamped) / 100}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)" }}
      />
      <text x="50%" y="47%" textAnchor="middle" dy="0.1em"
        style={{ fontFamily: "var(--font-display)", fontSize: size * 0.28, fontWeight: 700, fill: "var(--color-ink)" }}>
        {Math.round(clamped)}
      </text>
      <text x="50%" y="66%" textAnchor="middle"
        style={{ fontFamily: "var(--font-sans)", fontSize: size * 0.1, fontWeight: 600, fill: "var(--color-muted)" }}>
        PER CENT
      </text>
    </svg>
  );
}

/**
 * The phases as a run of segments. Finishing one is a visible, nameable
 * moment, which is the entire reason a thirty-item list gets finished at all.
 */
export function PhaseTrack({ schedule }: { schedule: Scheduled[] }) {
  return (
    <div className="flex flex-col gap-3">
      {PHASES.map((phase) => {
        const rows = schedule.filter((s) => s.step.phase === phase);
        if (!rows.length) return null;
        const done = rows.filter((r) => r.state === "done").length;
        const pct = Math.round((done / rows.length) * 100);
        const complete = done === rows.length;
        const overdue = rows.filter((r) => r.state === "overdue").length;

        return (
          <div key={phase} className="flex items-center gap-3">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
              complete ? "bg-teal-500 text-white" : overdue ? "bg-signal-100 text-signal" : "bg-wash text-muted"}`}>
              {complete ? "✓" : overdue ? "!" : ""}
            </span>
            <span className="w-32 shrink-0 text-[13px] font-semibold text-ink">{phase}</span>
            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-wash">
              <span
                className={`block h-full rounded-full ${complete ? "bg-teal-500" : "bg-brand-500"}`}
                style={{ width: `${pct}%`, transition: "width .8s cubic-bezier(.22,1,.36,1)" }}
              />
            </span>
            <span className="num w-12 shrink-0 text-right text-[12.5px] text-muted">{done}/{rows.length}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Milestones a student can actually feel. Earned, not awarded for showing up. */
export function Milestones({ schedule }: { schedule: Scheduled[] }) {
  const done = schedule.filter((s) => s.state === "done").length;
  const total = schedule.length;

  const earned = [
    { id: "started", label: "Made a start", got: done >= 1, hint: "Tick your first step" },
    { id: "quarter", label: "A quarter done", got: done >= total * 0.25, hint: `${Math.ceil(total * 0.25)} steps` },
    {
      id: "decided", label: "Decided", hint: "Finish the Decide phase",
      got: schedule.filter((s) => s.step.phase === "Decide").every((s) => s.state === "done"),
    },
    {
      id: "english", label: "English done", hint: "Finish the English test phase",
      got: schedule.filter((s) => s.step.phase === "English test").every((s) => s.state === "done"),
    },
    {
      id: "applied", label: "Applications out", hint: "Finish the Apply phase",
      got: schedule.filter((s) => s.step.phase === "Apply").every((s) => s.state === "done"),
    },
    { id: "half", label: "Halfway", got: done >= total / 2, hint: `${Math.ceil(total / 2)} steps` },
    {
      id: "visa", label: "Visa lodged", hint: "Finish the Visa phase",
      got: schedule.filter((s) => s.step.phase === "Visa").every((s) => s.state === "done"),
    },
    { id: "all", label: "Ready to fly", got: done === total && total > 0, hint: "Every step" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {earned.map((m) => (
        <span key={m.id} title={m.got ? "Earned" : m.hint}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold ${
            m.got ? "bg-tint-mint text-tint-mint-ink" : "bg-wash text-muted/70"}`}>
          <span aria-hidden>{m.got ? "★" : "☆"}</span>{m.label}
        </span>
      ))}
    </div>
  );
}

/** The single thing to do next, so the list never reads as thirty things at once. */
export function NextUp({ schedule, interactive }: { schedule: Scheduled[]; interactive: boolean }) {
  const next =
    schedule.find((s) => s.state === "overdue") ??
    schedule.find((s) => s.state === "due-soon") ??
    schedule.find((s) => s.state === "start-now") ??
    schedule.find((s) => s.state !== "done");

  if (!next) {
    return (
      <Card className="border-teal-500/30 bg-teal-100/40 p-6">
        <h2 className="h-tight text-[20px] text-teal-700">Everything is done.</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Thirty steps, all ticked. Whatever happens next, it will not be because something was
          forgotten.
        </p>
      </Card>
    );
  }

  const urgent = next.state === "overdue" || next.state === "due-soon";
  return (
    <Card className={urgent ? "border-signal/30 bg-signal-50 p-6" : "border-brand-200 bg-tint-lilac/50 p-6"}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-[11px] font-semibold uppercase tracking-[0.13em] ${urgent ? "text-brand-700" : "text-brand-700"}`}>
          Do this next
        </span>
        {next.dueOn && (
          <Chip tone={urgent ? "danger" : "brand"}>
            {next.daysLeft !== null && next.daysLeft < 0
              ? `${Math.abs(next.daysLeft)} days late`
              : `${next.daysLeft} days left`}
          </Chip>
        )}
      </div>
      <h2 className="h-tight mt-2 text-[21px]">{next.step.title}</h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{next.step.detail}</p>
      {next.step.href && (
        <Link href={next.step.href}
          className="mt-4 inline-flex items-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          {interactive ? "Do it in Stride →" : "Open the tool →"}
        </Link>
      )}
    </Card>
  );
}
