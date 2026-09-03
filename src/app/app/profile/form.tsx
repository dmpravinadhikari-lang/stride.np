"use client";

import { useActionState, useState, type ReactNode } from "react";
import { updateProfile, type ProfileState } from "./actions";
import { Alert, Button, Card, Field, inputClass } from "@/components/ui";
import { COUNTRIES, COUNTRY_CODES } from "@/lib/countries";
import type { StudentProfile } from "@/lib/profile";
import { ChipGroup, Slider } from "@/components/quiz";

/**
 * The student's own profile.
 *
 * Sixteen fields, eleven of which used to be a text box or a dropdown. The
 * eleven that have one right answer from a short list — country, level, intake,
 * gap, test, funding, sponsor — are now chips, and the four that are quantities
 * are sliders opening on a plausible value. What is left typed is the five
 * fields where the actual words matter, because they are what the SOP and the
 * interview read from: the course, the qualification, the work, the ties, the
 * plan. Turning those into a dropdown would make the AI downstream worse.
 *
 * The controls are client state written into hidden inputs, so the form is
 * still one plain server action and still works the way it did.
 *
 * The meter at the top is the gamification, and it is deliberately honest: it
 * counts exactly the twelve fields `profileCompleteness` counts, so the live
 * number here and the saved number elsewhere can never disagree. Inventing a
 * third, friendlier definition of "complete" was the obvious temptation and
 * would have made all three untrustworthy.
 */

const initial: ProfileState = { ok: true };
const v = (x: string | number | null | undefined) => (x === null || x === undefined ? "" : String(x));

/** Mirrors `profileCompleteness` in lib/profile — same fields, same labels. */
const SCORED = [
  ["target_country", "target country"],
  ["study_level", "study level"],
  ["intended_course", "intended course"],
  ["last_qualification", "last qualification"],
  ["last_gpa", "your result"],
  ["english_test", "English test"],
  ["funding_source", "who is funding you"],
  ["sponsor_relation", "sponsor"],
  ["sponsor_income_npr", "sponsor income"],
  ["budget_npr", "total budget"],
  ["ties_to_nepal", "ties to Nepal"],
  ["career_plan", "career plan"],
] as const;

const LEVELS = [
  { value: "diploma", label: "Diploma / Certificate" },
  { value: "bachelors", label: "Bachelors" },
  { value: "masters", label: "Masters" },
  { value: "phd", label: "PhD" },
] as const;

const TESTS = [
  { value: "ielts", label: "IELTS", min: 4, max: 9, step: 0.5, start: 6.5, fmt: (n: number) => n.toFixed(1) },
  { value: "pte", label: "PTE", min: 20, max: 90, step: 1, start: 58, fmt: (n: number) => String(Math.round(n)) },
  { value: "toefl", label: "TOEFL", min: 30, max: 120, step: 1, start: 80, fmt: (n: number) => String(Math.round(n)) },
  { value: "duolingo", label: "Duolingo", min: 50, max: 160, step: 5, start: 105, fmt: (n: number) => String(Math.round(n)) },
] as const;

/**
 * The old score field was free text, and students wrote "6.5 overall, no band
 * below 6" in it — which is the detail a counsellor actually needs, since a
 * single weak band blocks courses a good overall score would open. A bare
 * slider threw that away, so the band question is asked as one more tap.
 */
const BANDS = [
  { value: "all-fine", label: "No band below 6" },
  { value: "one-low", label: "One or more below 6" },
  { value: "unsure", label: "Not sure" },
] as const;

const GAPS = [
  { value: "0", label: "None" }, { value: "1", label: "1 year" },
  { value: "2", label: "2 years" }, { value: "3", label: "3 years" },
  { value: "4", label: "4 or more" },
] as const;

const FUNDING = [
  { value: "family_income", label: "Family income and savings" },
  { value: "education_loan", label: "Education loan" },
  { value: "loan_and_family", label: "Loan plus family" },
  { value: "scholarship", label: "Scholarship" },
  { value: "self", label: "Own earnings" },
] as const;

const SPONSORS = [
  { value: "Father", label: "Father" }, { value: "Mother", label: "Mother" },
  { value: "Brother", label: "Brother" }, { value: "Sister", label: "Sister" },
  { value: "Uncle", label: "Uncle" }, { value: "Self", label: "Myself" },
] as const;

/** The next eight intakes, so nobody types "July 2027" as free text. */
function intakes(): { value: string; label: string }[] {
  const months = ["January", "May", "July", "September"];
  const now = new Date();
  const out: { value: string; label: string }[] = [];
  for (let y = now.getFullYear(); out.length < 8; y++) {
    for (const m of months) {
      const label = `${m} ${y}`;
      if (new Date(`${m} 1, ${y}`) > now) out.push({ value: label, label });
      if (out.length === 8) break;
    }
  }
  return out;
}

const lakh = (n: number) => (n === 0 ? "Not said" : `NPR ${(n / 100000).toFixed(0)} lakh`);

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="h-tight text-[16px]">{title}</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">{hint}</p>
      <div className="mt-5 flex flex-col gap-6">{children}</div>
    </Card>
  );
}

/** A chip question that still posts through the plain form. */
function ChipField<T extends string>({
  label, name, hint, options, value, onChange,
}: {
  label: string; name: string; hint?: string;
  options: ReadonlyArray<{ value: T; label: string; icon?: string }>;
  value: T | ""; onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-ink">{label}</p>
      {hint && <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{hint}</p>}
      <div className="mt-3">
        <ChipGroup options={options} value={value} onChange={onChange} />
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

function SliderField({
  label, name, hint, min, max, step, value, onChange, format,
}: {
  label: string; name: string; hint?: string;
  min: number; max: number; step: number; value: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-ink">{label}</p>
      {hint && <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{hint}</p>}
      <div className="mt-4">
        <Slider min={min} max={max} step={step} value={value} onChange={onChange} format={format} />
      </div>
      <input type="hidden" name={name} value={value || ""} />
    </div>
  );
}

export function ProfileForm({ profile }: { profile: StudentProfile }) {
  const [state, action, pending] = useActionState(updateProfile, initial);

  const [country, setCountry] = useState(v(profile.target_country));
  const [level, setLevel] = useState(v(profile.study_level));
  const [intake, setIntake] = useState(v(profile.target_intake));
  const [gap, setGap] = useState(v(profile.study_gap_years));
  const [test, setTest] = useState(v(profile.english_test));
  const [score, setScore] = useState(Number(String(profile.english_score ?? "").match(/\d+(\.\d+)?/)?.[0] ?? 0));
  const [bands, setBands] = useState(() => {
    const t = String(profile.english_score ?? "").toLowerCase();
    if (t.includes("no band below")) return "all-fine";
    if (t.includes("below")) return "one-low";
    return "";
  });
  const [gpaMode, setGpaMode] = useState<"gpa" | "percent">("gpa");
  const [gpa, setGpa] = useState(Number(String(profile.last_gpa ?? "").match(/\d+(\.\d+)?/)?.[0] ?? 3.2));
  const [budget, setBudget] = useState(Number(profile.budget_npr ?? 0));
  const [funding, setFunding] = useState(v(profile.funding_source));
  const [sponsor, setSponsor] = useState(v(profile.sponsor_relation));
  const [income, setIncome] = useState(Number(profile.sponsor_income_npr ?? 0));

  // Typed fields are the ones where the words themselves are the answer.
  const [course, setCourse] = useState(v(profile.intended_course));
  const [qual, setQual] = useState(v(profile.last_qualification));
  const [work, setWork] = useState(v(profile.work_experience));
  const [occupation, setOccupation] = useState(v(profile.sponsor_occupation));
  const [ties, setTies] = useState(v(profile.ties_to_nepal));
  const [plan, setPlan] = useState(v(profile.career_plan));

  const testSpec = TESTS.find((t) => t.value === test);
  const bandNote = bands === "all-fine" ? ", no band below 6"
    : bands === "one-low" ? ", one or more bands below 6"
    : "";
  const scoreText = testSpec && score > 0 ? `${testSpec.fmt(score)} overall${bandNote}` : "";
  const gpaText = gpa > 0 ? (gpaMode === "gpa" ? `${gpa.toFixed(2)} / 4.0` : `${Math.round(gpa)}%`) : "";

  const filled: Record<(typeof SCORED)[number][0], string> = {
    target_country: country, study_level: level, intended_course: course,
    last_qualification: qual, last_gpa: gpaText, english_test: test,
    funding_source: funding, sponsor_relation: sponsor,
    sponsor_income_npr: income ? String(income) : "",
    budget_npr: budget ? String(budget) : "",
    ties_to_nepal: ties, career_plan: plan,
  };
  const missing = SCORED.filter(([k]) => filled[k].trim() === "").map(([, label]) => label);
  const doneCount = SCORED.length - missing.length;
  const pct = Math.round((doneCount / SCORED.length) * 100);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.message && <Alert tone={state.ok ? "teal" : "danger"}>{state.message}</Alert>}

      {/* The meter counts the same twelve fields the readiness score reads, so
          finishing it here moves the number on the dashboard by exactly what
          this says it will. */}
      <Card className="sticky top-3 z-10 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-ink">
              {doneCount === SCORED.length
                ? "Profile complete — every answer your counsellor needs."
                : `${doneCount} of ${SCORED.length} answered`}
            </p>
            <p className="mt-0.5 truncate text-[12.5px] text-muted">
              {missing.length === 0
                ? "The SOP and interview now have a real file to read from."
                : `Still to say: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? ` and ${missing.length - 3} more` : ""}`}
            </p>
          </div>
          <span className="num shrink-0 text-[20px] font-semibold text-brand-600">{pct}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-brand-400 transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Card>

      <Section title="Where you're going" hint="Each country judges applications differently, so this changes the questions you get asked.">
        <ChipField
          label="Target country" name="target_country" value={country} onChange={setCountry}
          options={COUNTRY_CODES.map((c) => ({ value: c, label: COUNTRIES[c].name, icon: COUNTRIES[c].flag }))}
        />
        <ChipField label="Study level" name="study_level" options={LEVELS} value={level} onChange={setLevel} />
        <ChipField
          label="Target intake" name="target_intake" options={intakes()} value={intake} onChange={setIntake}
          hint="The month your course starts, not the month you apply."
        />
        <Field label="Intended course" name="intended_course" hint="Be specific — 'MSc Cybersecurity' beats 'IT'.">
          <input id="intended_course" name="intended_course" value={course} onChange={(e) => setCourse(e.target.value)} className={inputClass} placeholder="Master of Information Technology" />
        </Field>
      </Section>

      <Section title="Your academic record" hint="Say it plainly. A gap or a low GPA explained is far safer than one an officer discovers.">
        <Field label="Last qualification" name="last_qualification">
          <input id="last_qualification" name="last_qualification" value={qual} onChange={(e) => setQual(e.target.value)} className={inputClass} placeholder="BSc CSIT, Tribhuvan University, 2024" />
        </Field>

        <div>
          <p className="text-[13px] font-semibold text-ink">Your result</p>
          <div className="mt-3">
            <ChipGroup
              options={[{ value: "gpa", label: "GPA (out of 4)" }, { value: "percent", label: "Percentage" }] as const}
              value={gpaMode}
              onChange={(m) => { setGpaMode(m); setGpa(m === "gpa" ? 3.2 : 65); }}
            />
          </div>
          <div className="mt-5">
            <Slider
              min={gpaMode === "gpa" ? 1.5 : 30} max={gpaMode === "gpa" ? 4 : 100}
              step={gpaMode === "gpa" ? 0.01 : 1}
              value={gpa} onChange={setGpa}
              format={(n) => (gpaMode === "gpa" ? `GPA ${n.toFixed(2)}` : `${Math.round(n)}%`)}
            />
          </div>
          <input type="hidden" name="last_gpa" value={gpaText} />
        </div>

        <ChipField label="Study gap" name="study_gap_years" options={GAPS} value={gap} onChange={setGap} hint="Years between finishing and starting again." />

        <Field label="Work experience" name="work_experience">
          <input id="work_experience" name="work_experience" value={work} onChange={(e) => setWork(e.target.value)} className={inputClass} placeholder="Junior support engineer, WorldLink, 14 months" />
        </Field>

        <div>
          <ChipField
            label="English test" name="english_test" value={test}
            options={[...TESTS.map((t) => ({ value: t.value, label: t.label })), { value: "", label: "Not taken yet" }]}
            onChange={(t) => { setTest(t); const s = TESTS.find((x) => x.value === t); setScore(s ? s.start : 0); }}
          />
          {testSpec && (
            <>
              <div className="mt-5">
                <Slider
                  min={testSpec.min} max={testSpec.max} step={testSpec.step}
                  value={score || testSpec.start} onChange={setScore}
                  format={testSpec.fmt}
                  note="Your overall score."
                />
              </div>
              <div className="mt-6">
                <p className="text-[13px] font-semibold text-ink">Your individual bands</p>
                <p className="mt-1 text-[12.5px] text-muted">
                  One weak band closes courses that your overall score would otherwise open.
                </p>
                <div className="mt-3">
                  <ChipGroup options={BANDS} value={bands} onChange={setBands} />
                </div>
              </div>
            </>
          )}
          <input type="hidden" name="english_score" value={scoreText} />
        </div>
      </Section>

      <Section title="Money" hint="This is where most applications are won or lost. Use real figures — the practice is worthless with invented ones.">
        <SliderField
          label="Total budget" name="budget_npr" min={0} max={20_000_000} step={100_000}
          value={budget} onChange={setBudget} format={lakh}
          hint="Tuition plus living costs for the whole course."
        />
        <ChipField label="Funding source" name="funding_source" options={FUNDING} value={funding} onChange={setFunding} />
        <ChipField label="Who is sponsoring you?" name="sponsor_relation" options={SPONSORS} value={sponsor} onChange={setSponsor} />
        <Field label="Sponsor occupation" name="sponsor_occupation">
          <input id="sponsor_occupation" name="sponsor_occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)} className={inputClass} placeholder="Construction supply business, Bharatpur" />
        </Field>
        <SliderField
          label="Sponsor's yearly income" name="sponsor_income_npr" min={0} max={10_000_000} step={100_000}
          value={income} onChange={setIncome} format={lakh}
          hint="As declared on the tax clearance."
        />
      </Section>

      <Section title="After the course" hint="Every destination asks some version of 'and then what?'. A vague answer here is the most common reason for refusal.">
        <Field label="Ties to Nepal" name="ties_to_nepal" hint="Property, family responsibility, a job to return to.">
          <input id="ties_to_nepal" name="ties_to_nepal" value={ties} onChange={(e) => setTies(e.target.value)} className={inputClass} placeholder="Family land in Chitwan, only son, father's business to take over" />
        </Field>
        <Field label="Career plan" name="career_plan" hint="Name a sector and a kind of employer, not 'serve my country'.">
          <input id="career_plan" name="career_plan" value={plan} onChange={(e) => setPlan(e.target.value)} className={inputClass} placeholder="Network security role in Nepali banking or telecom" />
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
