"use client";

import { useState } from "react";
import Link from "next/link";
import { COUNTRIES, COUNTRY_CODES, type CountryCode } from "@/lib/countries";
import { COST, FX_NPR, LEVEL_LABEL, type Level } from "@/modules/cost/data";
import { AFTER_STUDY, COMPARE_ROWS, type Verdict } from "@/modules/tools/compare";
import { npr } from "@/lib/terms";

const VERDICT: Record<Verdict, { dot: string; label: string; cls: string }> = {
  strong: { dot: "bg-teal-500", label: "Strong", cls: "text-teal-700" },
  fair: { dot: "bg-gold-600", label: "Mixed", cls: "text-gold-600" },
  weak: { dot: "bg-signal", label: "Difficult", cls: "text-signal" },
};

function money(code: CountryCode, level: Level) {
  const k = COST[code];
  const rate = FX_NPR[k.currency];
  const years = k.years[level];
  const tuition = k.tuition[level].typical;
  return {
    total: (tuition + k.living.typical) * years * rate,
    mustShow: (k.visaFunds.living + tuition) * rate,
    visa: COUNTRIES[code].visa,
    years,
  };
}

function Cell({ code, level, rowKey }: { code: CountryCode; level: Level; rowKey: string }) {
  const p = AFTER_STUDY[code];
  const m = money(code, level);

  if (rowKey === "cost") {
    return (
      <>
        <div className="num text-[19px] font-semibold text-ink">{npr(m.total)}</div>
        <div className="mt-0.5 text-[12px] text-muted">{m.years} year{m.years === 1 ? "" : "s"}, tuition and living</div>
      </>
    );
  }
  if (rowKey === "mustShow") {
    return (
      <>
        <div className="num text-[19px] font-semibold text-ink">{npr(m.mustShow)}</div>
        <div className="mt-0.5 text-[12px] text-muted">visible in the bank</div>
      </>
    );
  }
  if (rowKey === "visa") return <div className="text-[13.5px] text-ink-2">{m.visa}</div>;

  const verdictKey = `${rowKey}Verdict` as keyof typeof p;
  const verdict = p[verdictKey] as Verdict | undefined;
  const text = p[rowKey as keyof typeof p] as string;

  return (
    <>
      {verdict && (
        <div className={`mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold ${VERDICT[verdict].cls}`}>
          <span className={`inline-block h-2 w-2 rounded-full ${VERDICT[verdict].dot}`} aria-hidden />
          {VERDICT[verdict].label}
        </div>
      )}
      <div className="text-[13.5px] leading-relaxed text-ink-2">{text}</div>
    </>
  );
}

export function CountryDuel() {
  const [left, setLeft] = useState<CountryCode>("AU");
  const [right, setRight] = useState<CountryCode>("CA");
  const [level, setLevel] = useState<Level>("masters");

  const pick = (value: CountryCode, other: CountryCode, set: (c: CountryCode) => void) => {
    // Never let both sides be the same country. The comparison would say nothing.
    if (value === other) {
      set(other === "AU" ? "UK" : "AU");
      return;
    }
    set(value);
  };

  const selectCls =
    "rounded-xl border border-line-2 bg-white px-3 py-2 text-[14px] font-semibold text-ink focus:border-brand-400 focus:outline-none";

  return (
    <div className="rounded-[24px] border border-line bg-panel p-5 sm:p-7">
      {/* choosers */}
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr] sm:gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Compare</span>
          <select className={selectCls} value={left} onChange={(e) => pick(e.target.value as CountryCode, right, setLeft)}>
            {COUNTRY_CODES.map((k) => <option key={k} value={k}>{COUNTRIES[k].flag} {COUNTRIES[k].name}</option>)}
          </select>
        </label>
        <div className="hidden pb-2.5 text-center text-[13px] font-semibold text-muted sm:block">versus</div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">With</span>
          <select className={selectCls} value={right} onChange={(e) => pick(e.target.value as CountryCode, left, setRight)}>
            {COUNTRY_CODES.map((k) => <option key={k} value={k}>{COUNTRIES[k].flag} {COUNTRIES[k].name}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-muted">Studying at</span>
        {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
          <button key={l} type="button" onClick={() => setLevel(l)}
            className={`min-h-[40px] rounded-full px-4 text-[12.5px] font-semibold transition-colors ${
              level === l ? "bg-brand-600 text-white" : "bg-wash text-ink-2 hover:text-brand-600"}`}>
            {LEVEL_LABEL[l]}
          </button>
        ))}
      </div>

      {/* the table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-line">
        <div className="sticky top-0 z-10 grid grid-cols-2 bg-wash/95 backdrop-blur sm:grid-cols-[minmax(96px,1fr)_1.4fr_1.4fr]">
          <div className="hidden px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.11em] text-muted sm:block">
            Compare on
          </div>
          {[left, right].map((c, i) => (
            <div key={c} className={`flex items-center gap-2 px-4 py-3 ${i === 1 ? "border-l border-line" : "sm:border-l sm:border-line"}`}>
              <span className="text-lg" aria-hidden>{COUNTRIES[c].flag}</span>
              <span className="h-tight text-[14px] sm:text-[15px]">{COUNTRIES[c].name}</span>
            </div>
          ))}
        </div>

        {COMPARE_ROWS.map((row, i) => (
          <div key={row.key}
            className={`grid grid-cols-2 border-t border-line sm:grid-cols-[minmax(96px,1fr)_1.4fr_1.4fr] ${i % 2 ? "bg-wash/25" : ""}`}>
            <div className="col-span-2 px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted sm:col-span-1 sm:py-4 sm:text-[12.5px] sm:normal-case sm:tracking-normal sm:text-ink">
              {row.label}
            </div>
            {[left, right].map((c, n) => (
              <div key={c} className={`px-4 pb-4 pt-1 sm:border-l sm:border-line sm:py-4 ${n === 1 ? "border-l border-line" : ""}`}>
                <Cell code={c} level={level} rowKey={row.key} />
              </div>
            ))}
          </div>
        ))}

        <div className="grid grid-cols-2 border-t border-line bg-tint-amber/40 sm:grid-cols-[minmax(96px,1fr)_1.4fr_1.4fr]">
          <div className="col-span-2 px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-tint-amber-ink sm:col-span-1 sm:py-4 sm:text-[12.5px] sm:normal-case sm:tracking-normal">
            Watch out
          </div>
          {[left, right].map((c, n) => (
            <div key={c} className={`px-4 pb-4 pt-1 text-[13px] leading-relaxed text-ink-2 sm:border-l sm:border-line sm:py-4 ${n === 1 ? "border-l border-line" : ""}`}>
              {AFTER_STUDY[c].watchOut}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[12px] leading-relaxed text-muted">
          Costs and required funds come from published figures. Community size, earnings and
          residence odds are judgements, marked as such, narrow a shortlist with them, do not make
          the call on them.
        </p>
        <Link href="/tools/compare"
          className="inline-flex min-h-[40px] shrink-0 items-center text-[13px] font-semibold text-brand-600 hover:underline">
          Full comparison tool →
        </Link>
      </div>
    </div>
  );
}
