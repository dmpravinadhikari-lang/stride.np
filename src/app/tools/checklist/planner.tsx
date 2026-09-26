"use client";

import { useMemo, useState } from "react";
import { buildSchedule, parseIntake, STATE_LABEL } from "@/modules/checklist/schedule";
import { PHASES } from "@/modules/checklist/steps";
import { COUNTRIES, COUNTRY_CODES, type CountryCode } from "@/lib/countries";
import { Card, Chip, LinkButton, type Tone } from "@/components/ui";
import { ChipGroup } from "@/components/quiz";
import { NextUp, PhaseTrack, ProgressRing } from "@/modules/checklist/progress";

/** The eight real intake months ahead, so the field cannot be mistyped. */
const INTAKES: string[] = (() => {
  const months = ["January", "May", "July", "September"];
  const now = new Date();
  const out: string[] = [];
  for (let y = now.getFullYear(); out.length < 8; y++) {
    for (const m of months) {
      if (new Date(`${m} 1, ${y}`) > now) out.push(`${m} ${y}`);
      if (out.length === 8) break;
    }
  }
  return out;
})();

const fmt = (d: Date | null) =>
  d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ", ";

export function ChecklistPlanner() {
  const [countryCode, setCountryCode] = useState<CountryCode>("AU");
  const [intakeText, setIntakeText] = useState("July 2027");

  const intake = useMemo(() => parseIntake(intakeText), [intakeText]);
  const schedule = useMemo(
    () => buildSchedule(countryCode, intake, new Map()),
    [countryCode, intake],
  );
  const urgent = schedule.filter((s) => s.state === "overdue" || s.state === "due-soon" || s.state === "start-now");

  return (
    <div className="flex flex-col gap-5">
      {/* The intake used to be typed, and "July 27" or "2027 July" both parsed
          to nothing, leaving the whole plan blank with no explanation. Picking
          from the real intake months cannot fail. */}
      <Card className="p-6">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-[13px] font-semibold text-ink">Where are you going?</p>
            <div className="mt-3">
              <ChipGroup
                options={COUNTRY_CODES.map((k) => ({ value: k, label: COUNTRIES[k].name, icon: COUNTRIES[k].flag }))}
                value={countryCode}
                onChange={setCountryCode}
              />
            </div>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-ink">When does the course start?</p>
            <div className="mt-3">
              <ChipGroup
                options={INTAKES.map((i) => ({ value: i, label: i }))}
                value={intakeText}
                onChange={setIntakeText}
              />
            </div>
          </div>
        </div>
      </Card>

      {!intake && (
        <Card className="px-6 py-10 text-center">
          <p className="text-[15px] text-muted">Enter a month and year above, like "July 2027", and the plan appears here.</p>
        </Card>
      )}

      {intake && (
        <>
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-7">
              <ProgressRing pct={0} />
              <div className="min-w-[240px] flex-1">
                <h2 className="h-tight text-[19px]">{schedule.length} steps between here and the plane</h2>
                <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
                  Nothing ticked yet. This page does not know who you are. With an account the ring
                  fills as you go.
                </p>
              </div>
            </div>
            <div className="mt-6 border-t border-line pt-5">
              <PhaseTrack schedule={schedule} />
            </div>
          </Card>

          <NextUp schedule={schedule} interactive={false} />

          {urgent.length > 0 && (
            <Card className="border-gold-600/30 bg-gold-100/40 p-5">
              <h2 className="h-tight text-[16px] text-gold-600">
                {urgent.length} thing{urgent.length === 1 ? "" : "s"} you should already be doing
              </h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
                For a {intake.toLocaleDateString("en-GB", { month: "long", year: "numeric" })} intake, these are
                either late or due within a fortnight. If that is a surprise, it is the useful kind.
              </p>
            </Card>
          )}

          <div className="flex flex-col gap-4">
            {PHASES.map((phase) => {
              const rows = schedule.filter((s) => s.step.phase === phase);
              if (!rows.length) return null;
              return (
                <Card key={phase} className="overflow-hidden">
                  <div className="border-b border-line bg-wash/60 px-5 py-3">
                    <h2 className="h-tight text-[15px]">{phase}</h2>
                  </div>
                  <ul className="divide-y divide-line">
                    {rows.map((r) => {
                      const s = STATE_LABEL[r.state];
                      return (
                        <li key={r.step.id} className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[14.5px] font-semibold text-ink">{r.step.title}</span>
                            <Chip tone={s.tone as Tone}>{s.label}</Chip>
                          </div>
                          <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{r.step.detail}</p>
                          <p className="mt-1.5 text-[12.5px] text-ink-2">
                            <span className="font-semibold">Finish by {fmt(r.dueOn)}</span>
                            {r.startBy && r.step.takesDays > 2 && <> · start by {fmt(r.startBy)}</>}
                          </p>
                          {r.step.warning && (
                            <p className="mt-2 rounded-lg border border-gold-600/25 bg-gold-100/50 px-3 py-2 text-[12.5px] leading-relaxed text-ink-2">
                              {r.step.warning}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              );
            })}
          </div>

          <Card className="border-brand-200 bg-brand-50/60 p-5">
            <h3 className="h-tight text-[16px]">Want this to chase you?</h3>
            <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
              Through your consultancy you tick these off and Stride emails what is overdue, one
              message a morning, not one per task. Your counsellor sees the same plan.
            </p>
            <div className="mt-4"><LinkButton href="/signup" size="md">I run a consultancy</LinkButton></div>
          </Card>
        </>
      )}

      <p className="text-[12px] leading-relaxed text-muted">
        Lead times are realistic rather than official, an NOC is "a few days" on paper and often a
        fortnight in practice. Confirm anything time-critical with your consultancy.
      </p>
    </div>
  );
}
