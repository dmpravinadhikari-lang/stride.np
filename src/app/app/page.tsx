import Link from "next/link";
import { requireUser, scopeOf } from "@/lib/auth/current";
import { getProfile, profileCompleteness } from "@/lib/profile";
import { MODULES, access } from "@/lib/modules/registry";
import { allowanceFor } from "@/lib/usage";
import { planOf } from "@/lib/plans";
import { listDocs } from "@/modules/sop-studio/data";
import { listSessions } from "@/modules/ai-interview/data";
import { country } from "@/lib/countries";
import { activeProvider } from "@/lib/ai/provider";
import { Alert, Card, Chip, LinkButton, Meter, StatTile } from "@/components/ui";
import { recentActivity, styleFor } from "@/lib/crm/activity";
import { enabledModuleIds } from "@/lib/modules/entitlements";
import { readinessFor, weeklyStreak } from "@/lib/gamify/readiness";
import { achievementsFor, nextAchievement } from "@/lib/gamify/achievements";
import { ReadinessPanel } from "@/components/Readiness";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const user = await requireUser();
  const scope = scopeOf(user);
  const isStudent = user.role === "student";
  const profile = isStudent ? getProfile(user.id) : null;
  const completeness = profileCompleteness(profile);

  const docs = isStudent ? listDocs(scope) : [];
  const interviews = isStudent ? listSessions(scope) : [];
  const planId = user.tenantPlan;
  const budget = allowanceFor({
    tenantId: user.tenantId, tenantKind: user.tenantKind, tenantPlan: user.tenantPlan,
    userId: user.id, studentPlan: user.studentPlan,
  });
  const provider = activeProvider();
  // The same entitlement set the sidebar uses. Without passing it, a feature
  // a counsellor switched off for this student would keep its tile here, the
  // guard would refuse the click, but the student would still be shown a door
  // that is not theirs.
  const enabledIds = isStudent
    ? enabledModuleIds(user.id, user.tenantId, user.tenantPlan)
    : undefined;
  const live = MODULES.filter(
    (m) => m.status === "live" && access(m, { role: user.role, plan: planId, enabledIds }) === "open",
  );

  const feed = isStudent ? [] : recentActivity(scope, 12);

  // A student's standing: one honest number, what would move it, and how long
  // they have kept going. Computed from real progress only, see the note in
  // readiness.ts about why nothing here rewards spending the branch's credits.
  const readiness = isStudent ? readinessFor(user.id, user.tenantId) : null;
  const streak = isStudent ? weeklyStreak(user.id) : { weeks: 0, activeThisWeek: false };
  const achievements = isStudent ? achievementsFor(user.id) : [];
  const nextUp = isStudent ? nextAchievement(achievements) : null;

  const bestInterview = interviews
    .map((s) => (s.report ? JSON.parse(s.report) as { overall: number } : null))
    .filter(Boolean)
    .reduce<number>((best, r) => Math.max(best, r!.overall), 0);
  const bestSop = docs.reduce<number>((best, d) => Math.max(best, d.latest_score ?? 0), 0);

  return (
    <div className="flex flex-col gap-7">
      <header>
        <h1 className="display text-[30px]">
          {user.fullName.split(" ")[0]}, {isStudent ? "let's get you ready." : "here's your branch."}
        </h1>
        <p className="mt-2 text-[15px] text-ink-2">
          {isStudent && profile?.target_country
            ? <>You're aiming for {country(profile.target_country).name} {country(profile.target_country).flag}, {country(profile.target_country).visa}.</>
            : isStudent
              ? "Fill in your profile first. Every tool here reads from it, so you only answer once."
              : `${user.tenantName} · ${planOf(planId).label} plan.`}
        </p>
      </header>

      {isStudent && readiness && (
        <ReadinessPanel
          readiness={readiness}
          streak={streak}
          achievements={achievements}
          nextUp={nextUp}
        />
      )}

      {!isStudent && feed.length > 0 && (
        <Card className="p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="h-tight text-[16px]">What your branch did</h2>
            <Link href="/app/pipeline" className="text-[12.5px] font-semibold text-brand-600 hover:underline">
              Open the pipeline →
            </Link>
          </div>
          <p className="mt-1 text-[12.5px] text-muted">
            Newest first, across every student. Written as the work happens.
          </p>
          <ul className="mt-3 divide-y divide-line">
            {feed.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-baseline gap-2.5 py-2">
                <span aria-hidden className="text-[13px]">{styleFor(a.kind).icon}</span>
                <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink">
                  {a.student_name && (
                    <Link href={`/app/pipeline/${a.student_id}`} className="font-semibold text-brand-600 hover:underline">
                      {a.student_name}
                    </Link>
                  )}{" "}
                  {a.summary}
                </span>
                <span className="shrink-0 text-[11.5px] text-muted">{a.actor_label}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {provider.id === "sample" && (
        <Alert tone="gold" title="Running on sample answers">
          The AI engine is set to <code className="rounded bg-white/60 px-1 py-0.5 text-[12px]">sample</code>, so
          every result below is a realistic canned response. Nothing is being sent anywhere and nothing costs money.
          Switch <code className="rounded bg-white/60 px-1 py-0.5 text-[12px]">STRIDE_AI_PROVIDER</code> in
          .env.local when you're ready for real answers.
        </Alert>
      )}

      {isStudent && completeness.pct < 100 && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-[240px] flex-1">
              <div className="flex items-baseline justify-between">
                <h2 className="h-tight text-[16px]">Your profile is {completeness.pct}% complete</h2>
                <span className="num text-[13px] text-muted">{completeness.missing.length} left</span>
              </div>
              <div className="mt-2.5"><Meter value={completeness.pct} tone={completeness.pct > 70 ? "teal" : "gold"} /></div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
                Still missing: {completeness.missing.slice(0, 4).join(", ")}
                {completeness.missing.length > 4 && ` and ${completeness.missing.length - 4} more`}.
                An interviewer that doesn't know your sponsor can't ask about your sponsor.
              </p>
            </div>
            <LinkButton href="/app/profile" size="sm">Complete profile</LinkButton>
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="AI credits left" value={budget.remaining} sub={`of ${budget.allowance} this month · ${budget.scopeLabel}`} />
        {isStudent ? (
          <>
            <StatTile label="Best interview" value={bestInterview ? `${bestInterview}` : ", "} sub={bestInterview ? "out of 100" : "No completed interview yet"} tone="teal" />
            <StatTile label="Best statement" value={bestSop ? `${bestSop}` : ", "} sub={bestSop ? "out of 100" : "No statement scored yet"} tone="teal" />
          </>
        ) : (
          <>
            <StatTile label="AI calls this month" value={budget.calls} sub="across this branch" tone="grey" />
            <StatTile label="Estimated cost" value={`$${budget.costUsd.toFixed(2)}`} sub="what this would cost on the API" tone="grey" />
          </>
        )}
      </div>

      <section>
        <h2 className="h-tight text-[17px]">Ready to use</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {live.map((m) => (
            <Link key={m.id} href={m.route} className="group rounded-2xl border border-line bg-panel p-5 transition-colors hover:border-brand-400">
              <div className="flex items-start justify-between gap-3">
                <span className="text-2xl" aria-hidden>{m.icon}</span>
                <Chip tone="teal">Live</Chip>
              </div>
              <h3 className="h-tight mt-3 text-[16px] group-hover:text-brand-600">{m.name}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{m.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      {isStudent && (docs.length > 0 || interviews.length > 0) && (
        <section>
          <h2 className="h-tight text-[17px]">Where you left off</h2>
          <div className="mt-3 flex flex-col gap-2">
            {interviews.slice(0, 3).map((s) => (
              <Link key={s.id} href={`/app/interview/${s.id}`} className="flex items-center justify-between gap-4 rounded-xl border border-line bg-panel px-4 py-3 hover:border-brand-400">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-ink">
                    🎙️ {country(s.country).name} mock interview
                  </div>
                  <div className="text-[12.5px] text-muted">
                    {s.answered} of {s.question_budget} answered · {new Date(s.started_at).toLocaleDateString()}
                  </div>
                </div>
                <Chip tone={s.status === "complete" ? "teal" : "gold"}>
                  {s.status === "complete" ? "Report ready" : "In progress"}
                </Chip>
              </Link>
            ))}
            {docs.slice(0, 3).map((d) => (
              <Link key={d.id} href={`/app/sop/${d.id}`} className="flex items-center justify-between gap-4 rounded-xl border border-line bg-panel px-4 py-3 hover:border-brand-400">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-ink">✍️ {d.title}</div>
                  <div className="text-[12.5px] text-muted">
                    {d.versions} version{d.versions === 1 ? "" : "s"} · {country(d.country).name}
                  </div>
                </div>
                {d.latest_score !== null
                  ? <Chip tone={d.latest_score >= 70 ? "teal" : d.latest_score >= 50 ? "gold" : "danger"}>{d.latest_score}/100</Chip>
                  : <Chip tone="grey">Not scored</Chip>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
