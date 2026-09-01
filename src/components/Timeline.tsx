import { styleFor, type Activity } from "@/lib/crm/activity";

/**
 * The record of everything that has happened to one student's file.
 *
 * This is what a consultancy is actually selling. When a parent rings to ask
 * what has been done, or an owner wants to know why a file has not moved since
 * Dashain, the answer is here in order, with a name against every line.
 *
 * Read newest-first, because the question is nearly always "what happened
 * recently" rather than "how did this begin".
 */

function when(iso: string): string {
  const then = new Date(iso);
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 8) return `${days}d ago`;
  return then.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function Timeline({ items, emptyNote }: { items: Activity[]; emptyNote?: string }) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-muted">
        {emptyNote ?? "Nothing recorded yet. Every action on this file will appear here."}
      </p>
    );
  }

  return (
    <ol className="relative mt-1">
      {/* One continuous rule behind the markers, so the eye reads a sequence
          rather than a stack of unrelated rows. */}
      <span
        aria-hidden
        className="absolute bottom-4 left-[13px] top-4 w-px bg-line"
      />

      {items.map((a) => {
        const s = styleFor(a.kind);
        return (
          <li key={a.id} className="relative flex gap-3 py-2.5 pl-0">
            <span
              aria-hidden
              className="relative z-10 mt-0.5 flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full border border-line bg-panel text-[12px]"
              style={
                s.tint === "brand"
                  ? { background: "var(--color-brand-50)", borderColor: "var(--color-brand-200)" }
                  : s.tint === "wash"
                    ? undefined
                    : { background: `var(--color-tint-${s.tint})`, borderColor: "transparent" }
              }
            >
              {s.icon}
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13.5px] leading-snug text-ink">{a.summary}</p>
              <p className="mt-0.5 text-[11.5px] text-muted">
                {a.actor_label} &middot; <time dateTime={a.created_at}>{when(a.created_at)}</time>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
