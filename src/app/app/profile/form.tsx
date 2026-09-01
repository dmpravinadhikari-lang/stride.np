"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "./actions";
import { Alert, Button, Card, Field, inputClass } from "@/components/ui";
import { COUNTRIES, COUNTRY_CODES } from "@/lib/countries";
import type { StudentProfile } from "@/lib/profile";
import { MoneyField } from "@/components/MoneyField";

const initial: ProfileState = { ok: true };
const v = (x: string | number | null | undefined) => (x === null || x === undefined ? "" : String(x));

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="h-tight text-[16px]">{title}</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">{hint}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

export function ProfileForm({ profile }: { profile: StudentProfile }) {
  const [state, action, pending] = useActionState(updateProfile, initial);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.message && <Alert tone={state.ok ? "teal" : "danger"}>{state.message}</Alert>}

      <Section title="Where you're going" hint="Each country judges applications differently, so this changes the questions you get asked.">
        <Field label="Target country" name="target_country">
          <select id="target_country" name="target_country" defaultValue={v(profile.target_country)} className={inputClass}>
            <option value="">Not decided yet</option>
            {COUNTRY_CODES.map((c) => (
              <option key={c} value={c}>{COUNTRIES[c].flag} {COUNTRIES[c].name}</option>
            ))}
          </select>
        </Field>
        <Field label="Study level" name="study_level">
          <select id="study_level" name="study_level" defaultValue={v(profile.study_level)} className={inputClass}>
            <option value="">Choose…</option>
            <option value="diploma">Diploma / Certificate</option>
            <option value="bachelors">Bachelors</option>
            <option value="masters">Masters</option>
            <option value="phd">PhD</option>
          </select>
        </Field>
        <Field label="Intended course" name="intended_course" hint="Be specific — 'MSc Cybersecurity' beats 'IT'.">
          <input id="intended_course" name="intended_course" defaultValue={v(profile.intended_course)} className={inputClass} placeholder="Master of Information Technology" />
        </Field>
        <Field label="Target intake" name="target_intake">
          <input id="target_intake" name="target_intake" defaultValue={v(profile.target_intake)} className={inputClass} placeholder="July 2027" />
        </Field>
      </Section>

      <Section title="Your academic record" hint="Say it plainly. A gap or a low GPA explained is far safer than one an officer discovers.">
        <Field label="Last qualification" name="last_qualification">
          <input id="last_qualification" name="last_qualification" defaultValue={v(profile.last_qualification)} className={inputClass} placeholder="BSc CSIT, Tribhuvan University, 2024" />
        </Field>
        <Field label="Result (GPA or %)" name="last_gpa">
          <input id="last_gpa" name="last_gpa" defaultValue={v(profile.last_gpa)} className={inputClass} placeholder="3.42 / 4.0" />
        </Field>
        <Field label="Study gap (years)" name="study_gap_years" hint="0 if you're continuing straight on.">
          <input id="study_gap_years" name="study_gap_years" type="number" min={0} max={20} defaultValue={v(profile.study_gap_years)} className={inputClass} placeholder="1" />
        </Field>
        <Field label="Work experience" name="work_experience">
          <input id="work_experience" name="work_experience" defaultValue={v(profile.work_experience)} className={inputClass} placeholder="Junior support engineer, WorldLink, 14 months" />
        </Field>
        <Field label="English test" name="english_test">
          <select id="english_test" name="english_test" defaultValue={v(profile.english_test)} className={inputClass}>
            <option value="">Not taken yet</option>
            <option value="ielts">IELTS</option>
            <option value="pte">PTE</option>
            <option value="toefl">TOEFL</option>
            <option value="duolingo">Duolingo</option>
          </select>
        </Field>
        <Field label="Score" name="english_score">
          <input id="english_score" name="english_score" defaultValue={v(profile.english_score)} className={inputClass} placeholder="6.5 overall, no band below 6" />
        </Field>
      </Section>

      <Section title="Money" hint="This is where most applications are won or lost. Use real figures — the practice is worthless with invented ones.">
        <MoneyField
          label="Total budget (NPR)" name="budget_npr" defaultValue={v(profile.budget_npr)}
          hint="Tuition plus living costs for the whole course." placeholder="6500000"
        />
        <Field label="Funding source" name="funding_source">
          <select id="funding_source" name="funding_source" defaultValue={v(profile.funding_source)} className={inputClass}>
            <option value="">Choose…</option>
            <option value="family_income">Family income and savings</option>
            <option value="education_loan">Education loan</option>
            <option value="loan_and_family">Education loan plus family</option>
            <option value="scholarship">Scholarship</option>
            <option value="self">Own earnings</option>
          </select>
        </Field>
        <Field label="Sponsor relationship" name="sponsor_relation">
          <input id="sponsor_relation" name="sponsor_relation" defaultValue={v(profile.sponsor_relation)} className={inputClass} placeholder="Father" />
        </Field>
        <Field label="Sponsor occupation" name="sponsor_occupation">
          <input id="sponsor_occupation" name="sponsor_occupation" defaultValue={v(profile.sponsor_occupation)} className={inputClass} placeholder="Construction supply business, Bharatpur" />
        </Field>
        <MoneyField
          label="Sponsor annual income (NPR)" name="sponsor_income_npr" defaultValue={v(profile.sponsor_income_npr)}
          hint="As declared on the tax clearance." placeholder="4200000"
        />
      </Section>

      <Section title="After the course" hint="Every destination asks some version of 'and then what?'. A vague answer here is the most common reason for refusal.">
        <Field label="Ties to Nepal" name="ties_to_nepal" hint="Property, family responsibility, a job to return to.">
          <input id="ties_to_nepal" name="ties_to_nepal" defaultValue={v(profile.ties_to_nepal)} className={inputClass} placeholder="Family land in Chitwan, only son, father's business to take over" />
        </Field>
        <Field label="Career plan" name="career_plan" hint="Name a sector and a kind of employer, not 'serve my country'.">
          <input id="career_plan" name="career_plan" defaultValue={v(profile.career_plan)} className={inputClass} placeholder="Network security role in Nepali banking or telecom" />
        </Field>
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
