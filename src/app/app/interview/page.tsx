import Link from "next/link";
import { Icon } from "@/components/Icon";
import { requireScope } from "@/lib/auth/current";
import { listSessions } from "@/modules/ai-interview/data";
import { startInterview } from "@/modules/ai-interview/actions";
import { COUNTRIES, COUNTRY_CODES, INTERVIEW_KINDS, country } from "@/lib/countries";
import { getProfile } from "@/lib/profile";
import { Alert, Button, Card, Chip, Empty, Field, inputClass } from "@/components/ui";
import { requireModule } from "@/lib/auth/module-guard";

export const metadata = { title: "AI Mock Interview, STRIDE" };

export default async function InterviewListPage() {
  // Entitlement check before anything is read or billed.
  await requireModule("ai-interview");
  const { user, scope } = await requireScope();
  const sessions = listSessions(scope);
  const profile = getProfile(user.id);
  const thin = !profile?.sponsor_income_npr || !profile?.intended_course;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="display text-[28px]">AI Mock Interview</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          It has read your file. It will ask about your sponsor, your gap year and your course
          choice, and it will follow up when an answer is thin. The way a real officer does.
        </p>
      </header>

      {thin && (
        <Alert tone="gold" title="Your profile is missing the parts they push hardest on">
          Without your course and your sponsor's income, the interview can only ask generic
          questions. <Link href="/app/profile" className="font-semibold text-brand-600 hover:underline">Fill those in first</Link>. It takes two minutes and makes this far more useful.
        </Alert>
      )}

      <Card className="p-5 sm:p-6">
        <h2 className="h-tight text-[16px]">Start an interview</h2>
        <form action={startInterview} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Interview type" name="kind">
            <select id="kind" name="kind" className={inputClass} defaultValue="uk_credibility">
              {Object.entries(INTERVIEW_KINDS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Country" name="country">
            <select id="country" name="country" className={inputClass} defaultValue={profile?.target_country || "UK"}>
              {COUNTRY_CODES.map((c) => (
                <option key={c} value={c}>{COUNTRIES[c].flag} {COUNTRIES[c].name}</option>
              ))}
            </select>
          </Field>
          <Field label="How many questions" name="budget" hint="A real consular interview is often under ten. Start with eight.">
            <select id="budget" name="budget" className={inputClass} defaultValue="8">
              <option value="4">4, a quick drill</option>
              <option value="8">8, a realistic run</option>
              <option value="12">12, a thorough grilling</option>
            </select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" size="md">Begin interview</Button>
          </div>
        </form>
        <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
          Text mode. Voice, where you speak and it listens, arrives in phase 2; the questions and
          scoring are identical either way.
        </p>
      </Card>

      <section>
        <h2 className="h-tight text-[17px]">Past interviews</h2>
        {sessions.length === 0 ? (
          <div className="mt-3"><Empty icon={<Icon name="mic" size={22} />} title="No interviews yet">
            Your first one will be uncomfortable. That is the entire point of doing it here rather
            than at the embassy.
          </Empty></div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {sessions.map((s) => {
              const report = s.report ? (JSON.parse(s.report) as { overall: number }) : null;
              return (
                <Link key={s.id} href={`/app/interview/${s.id}`} className="flex items-center justify-between gap-4 rounded-xl border border-line bg-panel px-4 py-3.5 hover:border-brand-400">
                  <div className="min-w-0">
                    <div className="truncate text-[14.5px] font-semibold text-ink">
                      {INTERVIEW_KINDS[s.kind as keyof typeof INTERVIEW_KINDS]?.label ?? s.kind}
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-muted">
                      {country(s.country).flag} {country(s.country).name} · {s.answered}/{s.question_budget} answered ·
                      {" "}{new Date(s.started_at).toLocaleDateString()}
                    </div>
                  </div>
                  {report
                    ? <Chip tone={report.overall >= 70 ? "teal" : report.overall >= 50 ? "gold" : "danger"}>{report.overall}/100</Chip>
                    : <Chip tone="gold">In progress</Chip>}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
