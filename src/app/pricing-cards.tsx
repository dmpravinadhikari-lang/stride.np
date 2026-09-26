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

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className={`relative flex flex-col rounded-[20px] p-7 ${
              row.featured
                ? "bg-ink text-white ring-1 ring-ink lg:-mt-4 lg:mb-4 shadow-[0_40px_80px_-40px_rgba(15,23,42,.75)]"
                : "bg-panel ring-1 ring-line"
            }`}
          >
            {row.featured && (
              <span className="absolute -top-3 left-7 rounded-full bg-accent-500 px-3 py-1 text-[11.5px] font-semibold text-ink">
                Most offices
              </span>
            )}

            <h3 className={`h-tight text-[20px] ${row.featured ? "text-white" : "text-ink"}`}>{row.label}</h3>
            <p className={`mt-1 text-[13.5px] ${row.featured ? "text-white/65" : "text-muted"}`}>{row.for}</p>

            <div className="mt-6 flex items-baseline gap-2">
              <span className={`num text-[38px] font-medium leading-none ${row.featured ? "text-white" : "text-ink"}`}>
                {price(row.npr, code)}
              </span>
              <span className={`text-[13px] ${row.featured ? "text-white/60" : "text-muted"}`}>per month</span>
            </div>
            <p className={`mt-2 text-[12.5px] ${row.featured ? "text-white/55" : "text-muted"}`}>
              {code === "NPR"
                ? "The whole office, not per counsellor."
                : `Invoiced in NPR ${row.npr.toLocaleString("en-IN")}. Conversion is indicative.`}
            </p>

            <div className={`mt-5 rounded-2xl px-4 py-3 ${row.featured ? "bg-white/10" : "bg-wash"}`}>
              <div className={`text-[13px] font-medium ${row.featured ? "text-white" : "text-ink"}`}>
                {row.credits.toLocaleString("en-US")} AI credits a month
              </div>
              <div className={`mt-0.5 text-[12.5px] ${row.featured ? "text-white/60" : "text-muted"}`}>
                About {row.students} student{row.students === 1 ? "" : "s"} prepared end to end
              </div>
            </div>

            <ul className="mt-6 flex flex-1 flex-col gap-2.5">
              {row.lines.map((l) => (
                <li key={l} className={`flex items-start gap-2.5 text-[13.5px] ${row.featured ? "text-white/85" : "text-ink-2"}`}>
                  <Icon name="check" size={16} className={`mt-0.5 ${row.featured ? "text-accent-300" : "text-teal-700"}`} />
                  {l}
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className={`mt-7 inline-flex min-h-[46px] items-center justify-center rounded-full px-6 text-[14px] font-medium transition-colors ${
                row.featured
                  ? "bg-white text-ink hover:bg-white/90"
                  : "bg-ink text-white hover:bg-ink-2"
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
