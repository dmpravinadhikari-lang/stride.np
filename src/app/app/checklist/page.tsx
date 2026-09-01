import Link from "next/link";
import { requireScope } from "@/lib/auth/current";
import { getProfile } from "@/lib/profile";
import { country } from "@/lib/countries";
import { buildSchedule, needsAttention, parseIntake } from "@/modules/checklist/schedule";
import { progressFor } from "@/modules/checklist/data";
import { setIntake } from "@/modules/checklist/actions";
import { Timeline } from "@/modules/checklist/view";
import { NextUp, PhaseTrack, ProgressRing } from "@/modules/checklist/progress";
import { activeEmailProvider } from "@/lib/email/provider";
import { Alert, Button, Card, inputClass, Meter, StatTile } from "@/components/ui";
import { requireModule } from "@/lib/auth/module-guard";

export const metadata = { title: "Application Checklist — STRIDE" };

export default async function ChecklistPage() {
  // Entitlement check before anything is read or billed.
  await requireModule("checklist");
  const { user, scope } = await requireScope();
  const profile = getProfile(user.id);
  const intake = parseIntake(profile?.target_intake);
  const schedule = buildSchedule(profile?.target_country ?? null, intake, progressFor(scope, user.id));

  const done = schedule.filter((s) => s.state === "done").length;
  const overdue = schedule.filter((s) => s.state === "overdue").length;
  const urgent = schedule.filter(needsAttention).length;
  const c = profile?.target_country ? country(profile.target_country) : null;
  const provider = activeEmailProvider();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="display text-[28px]">Application Checklist</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          {intake
            ? <>Every step for {c ? c.name : "your destination"}, dated backwards from {intake.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}. The dates are the realistic ones, not the official ones.</>
            : "Tell us when your course starts and every step below gets a real date."}
        </p>
      </header>

      {!intake && (
        <Card className="p-5">
          <h2 className="h-tight text-[16px]">When does your course start?</h2>
          <p className="mt-1 text-[13px] text-muted">
            A month and year is enough — "July 2027". Everything else is worked out from it.
          </p>
          <form action={setIntake} className="mt-4 flex flex-wrap gap-2">
            <input name="target_intake" required aria-label="Course start month and year" className={`${inputClass} max-w-[220px]`} placeholder="July 2027" />
            <Button type="submit">Build my plan</Button>
          </form>
        </Card>
      )}

      {intake && (
        <>
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-7">
              <ProgressRing pct={(done / schedule.length) * 100} />
              <div className="min-w-[240px] flex-1">
                <h2 className="h-tight text-[19px]">
                  {done} of {schedule.length} steps done
                </h2>
                <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
                  {overdue > 0
                    ? `${overdue} already past its date, ${urgent} needing attention.`
                    : urgent > 0
                      ? `${urgent} coming up. Nothing overdue.`
                      : "Nothing overdue and nothing pressing. Rare — enjoy it."}
                </p>
                <div className="mt-4">
                  <Link
                    href="/app/progress"
                    className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:underline sm:min-h-0"
                  >
                    🏆 See all your milestones →
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-line pt-5">
              <PhaseTrack schedule={schedule} />
            </div>

            <form action={setIntake} className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <label htmlFor="intake-update" className="text-[13px] text-muted">Course starts</label>
              <input id="intake-update" name="target_intake" defaultValue={profile?.target_intake ?? ""} className={`${inputClass} max-w-[180px]`} />
              <Button type="submit" variant="secondary" size="sm">Update dates</Button>
            </form>
          </Card>

          <NextUp schedule={schedule} interactive />

          {overdue > 0 && (
            <Alert tone="danger" title={`${overdue} step${overdue === 1 ? " is" : "s are"} already overdue`}>
              Being late is recoverable — most of these can be caught up. Being late and not knowing
              is what costs an intake. Work down the list from the top.
            </Alert>
          )}

          <Alert tone="brand" title="You will be reminded">
            {provider.id === "outbox"
              ? "Deadline emails are switched to the local outbox while STRIDE is being built — nothing is actually sent yet. On the server this runs every morning."
              : "One email each morning when something is overdue or lands within a fortnight. One message, not one per task."}
          </Alert>

          <Timeline schedule={schedule} studentId={user.id} interactive />
        </>
      )}
    </div>
  );
}
