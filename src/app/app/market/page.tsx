import Link from "next/link";
import { requirePermission } from "@/lib/auth/current";
import { planAllows } from "@/lib/plans";
import { PlanGate } from "@/components/PlanGate";
import { Card, Chip, PageHeader, Panel, Th, type Tone } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { country } from "@/lib/countries";
import { shortDate } from "@/lib/dates";
import { demand, openIntakes, splitMovements } from "@/modules/market/data";

export const metadata = { title: "Market, OfficeYak" };

const DIRECTION: Record<string, { tone: Tone; label: string }> = {
  harder: { tone: "danger", label: "Harder" },
  easier: { tone: "teal", label: "Easier" },
  process: { tone: "sky", label: "Process" },
  opportunity: { tone: "accent", label: "Opportunity" },
};

const flagOf = (code: string | null) => (code ? `${country(code).flag} ${country(code).name}` : "All destinations");

/**
 * The market, for an owner deciding where to put the next counsellor.
 *
 * Three questions: what are students searching for, what changed in the rules
 * and when does it bite, and which intake closes next. Every block carries
 * the date it was compiled, because a number with no date on it gets quoted
 * to a student two years later.
 */
export default async function MarketPage() {
  const user = await requirePermission("market:view");
  if (!planAllows(user.tenantPlan, "market")) {
    return (
      <PlanGate
        feature="market" title="Market"
        blurb="What students are searching for, which rules change and when, and which intake closes next."
      />
    );
  }

  const d = demand();
  const m = splitMovements();
  const intakes = openIntakes();
  const peak = Math.max(...d.rows.map((r) => r.volume), 1);
  const topDest = Math.max(...d.byDestination.map(([, v]) => v), 1);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Market"
        sub="What students are searching for, what changed in the rules, and which intake closes next."
      />

      {d.source === "seed" && (
        <Card className="flex flex-wrap items-center gap-x-3 gap-y-1 border-accent-300 bg-accent-50 px-4 py-3">
          <Icon name="alert" size={16} className="text-accent-600" />
          <span className="text-[13.5px] font-medium text-ink">This is a starting set, not a live feed.</span>
          <span className="text-[13px] text-ink-2">
            Compiled {shortDate(d.asOf)}. Connect your own keyword source and these figures refresh on their own.
          </span>
        </Card>
      )}

      {/* ----------------------------------------------- what is coming next */}
      {m.coming.length > 0 && (
        <Panel title="Coming, and it changes your advice" note="Rule changes with a date on them. Read the source before you advise.">
          <ul className="divide-y divide-line">
            {m.coming.map((x) => (
              <li key={x.id} className="flex flex-col gap-1.5 px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone={DIRECTION[x.direction].tone}>{DIRECTION[x.direction].label}</Chip>
                  <span className="text-[13px] text-muted">{flagOf(x.destination)}</span>
                  <span className="ml-auto text-[13px] font-medium text-ink-2">From {shortDate(x.effectiveOn)}</span>
                </div>
                <div className="text-[14.5px] font-medium text-ink">{x.headline}</div>
                <p className="text-[13.5px] leading-relaxed text-ink-2">{x.whatItMeans}</p>
                <div className="text-[12.5px] text-muted">
                  {x.sourceUrl ? (
                    <a href={x.sourceUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline">
                      {x.sourceName}
                    </a>
                  ) : x.sourceName}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* ------------------------------------------------------ what students want */}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Panel
          title={`What Nepal is searching for`}
          note={`Monthly searches, ${d.geo}, as of ${shortDate(d.asOf)}. Year on year change beside it.`}
        >
          <ul className="divide-y divide-line">
            {d.rows.slice(0, 10).map((k) => (
              <li key={k.term} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] text-ink">{k.term}</span>
                  <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-wash">
                    <span
                      className="block h-full rounded-full bg-brand-400"
                      style={{ width: `${Math.max(4, (k.volume / peak) * 100)}%` }}
                    />
                  </span>
                </span>
                <span className="num w-16 shrink-0 text-right text-[13px] font-medium text-ink">
                  {k.volume.toLocaleString("en-IN")}
                </span>
                <span className={`num w-14 shrink-0 text-right text-[12.5px] font-medium ${
                  k.change > 0 ? "text-teal-700" : k.change < 0 ? "text-danger-600" : "text-muted"}`}>
                  {k.change > 0 ? "+" : ""}{k.change}%
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Rising fastest" note="Where the questions are moving.">
            <ul className="divide-y divide-line">
              {d.rising.map((k) => (
                <li key={k.term} className="flex items-baseline gap-2 px-4 py-2.5">
                  <Icon name="arrow" size={14} className="-rotate-45 text-teal-700" />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{k.term}</span>
                  <span className="num shrink-0 text-[13px] font-medium text-teal-700">+{k.change}%</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Falling" note="Cooling off. Worth knowing before you staff a desk for it.">
            <ul className="divide-y divide-line">
              {d.falling.map((k) => (
                <li key={k.term} className="flex items-baseline gap-2 px-4 py-2.5">
                  <Icon name="arrow" size={14} className="rotate-45 text-danger-600" />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{k.term}</span>
                  <span className="num shrink-0 text-[13px] font-medium text-danger-600">{k.change}%</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {/* ----------------------------------------------------- demand by country */}
      <Panel title="Demand by destination" note="Total monthly searches behind each country, from the terms above.">
        <ul className="flex flex-col gap-2 px-4 py-4">
          {d.byDestination.map(([code, volume]) => (
            <li key={code} className="flex items-center gap-3">
              <span className="w-[140px] shrink-0 truncate text-[13.5px] text-ink">{flagOf(code)}</span>
              <span className="h-5 flex-1 overflow-hidden rounded-md bg-wash">
                <span className="block h-full rounded-md bg-brand-500" style={{ width: `${(volume / topDest) * 100}%` }} />
              </span>
              <span className="num w-20 shrink-0 text-right text-[13px] font-medium text-ink-2">
                {volume.toLocaleString("en-IN")}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      {/* -------------------------------------------------------- the calendar */}
      <Panel title="Intakes closing next" note="The date a file has to be in by, not the day term starts.">
        <div className="scroll-soft overflow-x-auto">
          <table className="w-full min-w-[620px] text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-wash/60 text-left">
                {["Destination", "Intake", "Apply by", "Left", "Note"].map((h) => <Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {intakes.rows.slice(0, 8).map((i) => (
                <tr key={`${i.destination}-${i.intake}`} className="border-b border-line last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink">{flagOf(i.destination)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink-2">{i.intake}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink-2">{shortDate(i.applyBy)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <Chip tone={i.daysLeft < 0 ? "grey" : i.daysLeft < 30 ? "danger" : i.daysLeft < 75 ? "gold" : "teal"}>
                      {i.daysLeft < 0 ? "Closed" : `${i.daysLeft} days`}
                    </Chip>
                  </td>
                  <td className="px-4 py-2.5 text-muted">{i.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* --------------------------------------------------------- what landed */}
      <Panel title="Already in force" note="Changes that have landed, newest first.">
        <ul className="divide-y divide-line">
          {m.landed.map((x) => (
            <li key={x.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
              <Chip tone={DIRECTION[x.direction].tone}>{DIRECTION[x.direction].label}</Chip>
              <span className="min-w-0 flex-1 text-[13.5px] text-ink">{x.headline}</span>
              <span className="text-[12.5px] text-muted">{flagOf(x.destination)} · {shortDate(x.effectiveOn)}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <p className="text-[12.5px] leading-relaxed text-muted">
        Compiled {shortDate(m.asOf)}. Rules change between updates: check the linked source before you advise a student.
        {" "}
        <Link href="/app/reports" className="font-medium text-brand-600 hover:underline">See how your own office compares</Link>
      </p>
    </div>
  );
}
