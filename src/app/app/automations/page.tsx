import { requirePermission } from "@/lib/auth/current";
import { Card, Chip, PageHeader, Panel, Th } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { RULES, lastRuns, ruleEnabled } from "@/lib/email/rules";
import { mailTally, recentMail, inSendingHours } from "@/lib/email/queue";
import { activeEmailProvider } from "@/lib/email/provider";
import { whenText } from "@/lib/dates";
import { RuleSwitch, RunNow, TestMail, Retry } from "./controls";

export const metadata = { title: "Automatic emails, Stride" };
export const dynamic = "force-dynamic";

/**
 * What the product sends on its own, and what it actually sent.
 *
 * Both halves matter. An owner who cannot see the second half has no reason
 * to believe the first: "it emails your counsellors" is a claim, and a list
 * of yesterday's messages with their delivery state is the evidence.
 */
export default async function AutomationsPage() {
  const user = await requirePermission("branch:settings");
  const runs = lastRuns(user.tenantId);
  const tally = mailTally(user.tenantId);
  const mail = recentMail(user.tenantId, 20);
  const provider = activeEmailProvider();
  const sending = inSendingHours();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Automatic emails"
        sub="What Stride sends your office without anybody pressing anything."
      />

      {/* --------------------------------------------------------- the state */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-line bg-panel px-4 py-3.5">
          <span className="absolute inset-y-0 left-0 w-[3px] bg-tint-sky-ink" aria-hidden />
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Sent</div>
          <div className="num mt-1 text-[26px] font-semibold leading-none text-ink">{tally.sent ?? 0}</div>
          <div className="mt-1.5 text-[12.5px] text-muted">All time, this consultancy.</div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-line bg-panel px-4 py-3.5">
          <span className="absolute inset-y-0 left-0 w-[3px] bg-tint-amber-ink" aria-hidden />
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Waiting</div>
          <div className="num mt-1 text-[26px] font-semibold leading-none text-ink">{tally.queued ?? 0}</div>
          <div className="mt-1.5 text-[12.5px] text-muted">
            {sending ? "Goes out on the next run." : "Held until six in the morning."}
          </div>
        </div>
        <div className={`relative overflow-hidden rounded-2xl border px-4 py-3.5 ${
          (tally.failed ?? 0) > 0 ? "border-danger-600/30 bg-danger-100" : "border-line bg-panel"
        }`}>
          <span className="absolute inset-y-0 left-0 w-[3px] bg-tint-peach-ink" aria-hidden />
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Failed</div>
          <div className={`num mt-1 text-[26px] font-semibold leading-none ${(tally.failed ?? 0) > 0 ? "text-danger-600" : "text-ink"}`}>
            {tally.failed ?? 0}
          </div>
          <div className="mt-1.5 text-[12.5px] text-muted">Tried five times, then left for a person.</div>
        </div>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <Icon name="inbox" size={16} className="text-brand-600" />
            Mail is going out through {provider.label}
          </div>
          <p className="mt-1 text-[12.5px] text-muted">
            {provider.id === "outbox"
              ? "Nothing leaves this machine. Messages are written to data/outbox so you can read exactly what would have been sent."
              : "Real mail. Every message is written down here first, so nothing is lost if the server refuses it."}
            {" "}Sending hours are six in the morning to nine at night, Kathmandu.
          </p>
        </div>
        <TestMail />
      </Card>

      {/* ----------------------------------------------------- the automations */}
      <section className="flex flex-col gap-3">
        <h2 className="h-tight text-[17px]">What goes out on its own</h2>
        <ul className="flex flex-col gap-3">
          {RULES.map((rule) => {
            const on = ruleEnabled(user.tenantId, rule);
            const last = runs[rule.id];
            return (
              <li
                key={rule.id}
                className={`settle rounded-2xl border px-5 py-4 ${on ? "border-line bg-panel" : "border-line bg-wash/50"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="h-tight text-[15px] text-ink">{rule.label}</h3>
                      <Chip tone={rule.cadence === "daily" ? "sky" : "lilac"}>
                        {rule.cadence === "daily" ? "Every morning" : "Once a week"}
                      </Chip>
                      {!on && <Chip tone="grey">Off</Chip>}
                    </div>
                    <p className="mt-1.5 max-w-2xl text-[13.5px] leading-snug text-ink-2">{rule.blurb}</p>
                    <p className="mt-1 text-[12.5px] text-muted">
                      Goes to: {rule.who}
                      {last && (
                        <>
                          {" · "}Last run {whenText(last.ran_at.slice(0, 10))}, {last.queued} written
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <RunNow ruleId={rule.id} disabled={!on} />
                    <RuleSwitch ruleId={rule.id} on={on} label={rule.label} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-[12.5px] text-muted">
          Each person can also turn their own copy off in their profile. Switching an automation off
          here stops it for the whole consultancy.
        </p>
      </section>

      {/* ---------------------------------------------------------- the outbox */}
      <Panel
        title="The last twenty messages"
        note="Every email this consultancy has sent, and what happened to it."
      >
        {mail.length === 0 ? (
          <p className="px-5 py-5 text-[13.5px] text-muted">
            Nothing has been sent yet. Run one of the automations above to see what it looks like.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead className="border-b border-line">
                <tr>
                  <Th>Subject</Th>
                  <Th>To</Th>
                  <Th>When</Th>
                  <Th>State</Th>
                  <Th className="text-right">{""}</Th>
                </tr>
              </thead>
              <tbody>
                {mail.map((m) => (
                  <tr key={m.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="text-[13.5px] font-medium text-ink">{m.subject}</div>
                      {m.error && <div className="text-[12px] text-danger-600">{m.error}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-ink-2">
                      <div>{m.full_name}</div>
                      <div className="text-[12px] text-muted">{m.email}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[12.5px] text-muted">
                      {whenText(m.created_at.slice(0, 10))}
                    </td>
                    <td className="px-4 py-2.5">
                      <Chip tone={m.status === "sent" ? "teal" : m.status === "failed" ? "danger" : "gold"}>
                        {m.status === "sent" ? "Sent" : m.status === "failed" ? "Failed" : "Waiting"}
                      </Chip>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {m.status === "failed" && <Retry id={m.id} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
