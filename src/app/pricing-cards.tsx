"use client";

import { useState } from "react";
import Link from "next/link";
import { CURRENCIES, CURRENCY_CODES, RATES_SET_ON, price, type CurrencyCode } from "@/lib/money";
import { Icon } from "@/components/Icon";

type Row = { id: string; label: string; for: string; npr: number; credits: number; students: number; lines: string[]; featured?: boolean };

/**
 * The plan cards, in whichever currency the reader thinks in.
 *
 * An owner in Kathmandu prices in rupees, the partner they answer to in
 * Sydney prices in dollars, and a franchise conversation in London happens in
 * pounds. Making all three read the same page without doing arithmetic is the
 * whole point of the switch.
 */
export function PricingCards({ rows }: { rows: Row[] }) {
  const [code, setCode] = useState<CurrencyCode>("NPR");

  return (
    <>
      <div className="mt-7 flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-muted">Show prices in</span>
        <div className="flex flex-wrap gap-1 rounded-full border border-line bg-panel p-1">
          {CURRENCY_CODES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCode(c)}
              aria-pressed={code === c}
              className={`min-h-[34px] rounded-full px-3.5 text-[13px] font-medium transition-colors ${
                code === c ? "bg-ink text-white" : "text-ink-2 hover:bg-wash"
              }`}
            >
              {CURRENCIES[c].symbol} {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className={`relative flex flex-col overflow-hidden rounded-2xl p-7 ${
              row.featured ? "bg-ink text-white" : "border border-line bg-panel"
            }`}
          >
            {/* The bell, cropped into the corner at the stated eight percent.
                The guidelines allow it on a Navy card and nowhere else. */}
            {row.featured && (
              <svg
                aria-hidden viewBox="0 0 64 64" width={180} height={180}
                className="pointer-events-none absolute -bottom-14 -right-12 opacity-[0.08]"
              >
                <rect x="28" y="4" width="8" height="10" rx="3" fill="#fff" />
                <path d="M18 18 Q32 10 46 18 L52 44 L12 44 Z" fill="#fff" />
                <path d="M18 18 Q32 10 46 18 L48 30 L16 30 Z" fill="#fff" opacity="0.55" />
                <rect x="8" y="42" width="48" height="8" rx="4" fill="#fff" />
                <circle cx="32" cy="55" r="5" fill="#fff" />
              </svg>
            )}

            <div className="relative flex items-center justify-between gap-3">
              <h3 className={`text-[14px] font-medium ${row.featured ? "text-white/70" : "text-ink-2"}`}>{row.label}</h3>
              {row.featured && (
                <span className="rounded-full bg-accent-500 px-2.5 py-1 text-[11px] font-medium text-ink">
                  Most chosen
                </span>
              )}
            </div>

            <div className="relative mt-4 flex items-baseline gap-1.5">
              <span
                className={`mono font-medium leading-none ${row.featured ? "text-white" : "text-ink"}`}
                style={{ fontSize: 32, letterSpacing: "-0.03em" }}
              >
                {price(row.npr, code)}
              </span>
              <span className={`text-[13px] ${row.featured ? "text-white/55" : "text-muted"}`}>/mo</span>
            </div>
            <p className={`relative mt-2 text-[14px] leading-relaxed ${row.featured ? "text-white/70" : "text-ink-2"}`}>{row.for}</p>
            <p className={`mt-2 text-[12.5px] ${row.featured ? "text-white/55" : "text-muted"}`}>
              {code === "NPR"
                ? "The whole office, not per counsellor."
                : `Invoiced in NPR ${row.npr.toLocaleString("en-IN")}. Conversion is indicative.`}
            </p>

            <div className={`relative mt-5 rounded-xl px-4 py-3 ${row.featured ? "bg-white/10" : "bg-wash"}`}>
              <div className={`text-[13px] font-medium ${row.featured ? "text-white" : "text-ink"}`}>
                {row.credits.toLocaleString("en-US")} AI credits a month
              </div>
              <div className={`mt-0.5 text-[12.5px] ${row.featured ? "text-white/60" : "text-muted"}`}>
                About {row.students} student{row.students === 1 ? "" : "s"} prepared end to end
              </div>
            </div>

            <ul className="relative mt-6 flex flex-1 flex-col gap-2.5">
              {row.lines.map((l) => (
                <li key={l} className={`flex items-start gap-2.5 text-[13.5px] ${row.featured ? "text-white/85" : "text-ink-2"}`}>
                  <Icon name="check" size={16} className={`mt-0.5 ${row.featured ? "text-accent-300" : "text-teal-700"}`} />
                  {l}
                </li>
              ))}
            </ul>

            {/* Orange on the chosen plan, outlined on the others: the one
                filled button in the row is the one being recommended. */}
            <Link
              href="/signup"
              className={`relative mt-7 inline-flex min-h-[46px] items-center justify-center rounded-[10px] px-6 text-[15px] font-semibold transition-colors ${
                row.featured
                  ? "bg-brand-500 text-ink hover:bg-brand-400"
                  : "border border-line-2 text-ink hover:border-brand-400 hover:text-brand-600"
              }`}
            >
              Start free
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-5 text-[12.5px] text-muted">
        Rates set {new Date(RATES_SET_ON).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        {" "}and shown as a guide. Invoices are raised in Nepali rupees.
      </p>
    </>
  );
}
