"use client";

import { useState } from "react";
import { ackRisk } from "@/modules/sop-studio/actions";
import { SeverityChip } from "@/components/ui";
import type { SopWarning } from "@/modules/sop-studio/types";

/**
 * Always on screen. The platform will write a whole statement for a student, 
 * that was a deliberate decision, so the risks travel with it rather than
 * sitting in a help page nobody opens.
 */
export function RiskPanel({
  warnings, acknowledged, docId,
}: { warnings: SopWarning[]; acknowledged: boolean; docId: string }) {
  const [open, setOpen] = useState(!acknowledged);

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-danger-600/30 bg-danger-100/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg" aria-hidden>⚠️</span>
          <div>
            <h2 className="h-tight text-[15.5px] text-danger-600">
              Read this before you use anything on this page
            </h2>
            <p className="mt-0.5 text-[13px] text-ink-2">
              {warnings.length} things that can go wrong with an AI-written statement.
              {acknowledged && !open ? " You've acknowledged these." : ""}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-[12px] font-semibold text-danger-600">
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {open && (
        <div className="border-t border-danger-600/20 px-5 pb-5 pt-4">
          <ul className="flex flex-col gap-3.5">
            {warnings.map((w) => (
              <li key={w.title} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityChip severity={w.severity} />
                  <span className="h-tight text-[14px]">{w.title}</span>
                </div>
                <p className="text-[13.5px] leading-relaxed text-ink-2">{w.detail}</p>
              </li>
            ))}
          </ul>

          {!acknowledged && (
            <form action={ackRisk} className="mt-5 border-t border-danger-600/20 pt-4">
              <input type="hidden" name="id" value={docId} />
              <button
                type="submit"
                className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-danger-600 ring-1 ring-danger-600/30 hover:bg-danger-100"
              >
                I understand. I will rewrite this in my own words
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
