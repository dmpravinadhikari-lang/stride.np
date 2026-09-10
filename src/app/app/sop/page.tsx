import Link from "next/link";
import { requireScope } from "@/lib/auth/current";
import { listDocs } from "@/modules/sop-studio/data";
import { createSopDoc } from "@/modules/sop-studio/actions";
import { COUNTRIES, COUNTRY_CODES, country } from "@/lib/countries";
import { Button, Card, Chip, Empty, Field, inputClass } from "@/components/ui";
import { requireModule } from "@/lib/auth/module-guard";

export const metadata = { title: "SOP Studio, STRIDE" };

export default async function SopListPage() {
  // Entitlement check before anything is read or billed.
  await requireModule("sop-studio");
  const { scope } = await requireScope();
  const docs = listDocs(scope);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="display text-[28px]">SOP Studio</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Draft a statement from your profile, or paste one you've written and have it scored the
          way an assessor would score it. Every draft comes with what could go wrong attached.
        </p>
      </header>

      <Card className="p-5 sm:p-6">
        <h2 className="h-tight text-[16px]">Start a new statement</h2>
        <form action={createSopDoc} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Country" name="country">
            <select id="country" name="country" className={inputClass} defaultValue="AU">
              {COUNTRY_CODES.map((c) => (
                <option key={c} value={c}>{COUNTRIES[c].flag} {COUNTRIES[c].name}, {COUNTRIES[c].statement}</option>
              ))}
            </select>
          </Field>
          <Field label="Document type" name="doc_type">
            <select id="doc_type" name="doc_type" className={inputClass} defaultValue="sop">
              <option value="sop">Statement of purpose</option>
              <option value="gs_statement">Genuine Student statement (Australia)</option>
              <option value="personal_statement">Personal statement (UK)</option>
              <option value="study_plan">Study plan (Canada)</option>
            </select>
          </Field>
          <Field label="University" name="university" hint="Optional, but a named university makes the draft far more specific.">
            <input id="university" name="university" className={inputClass} placeholder="University of Wollongong" />
          </Field>
          <Field label="Course" name="course">
            <input id="course" name="course" className={inputClass} placeholder="Master of Information Technology" />
          </Field>
          <Field label="Give it a name" name="title">
            <input id="title" name="title" className={inputClass} placeholder="Wollongong, MIT" />
          </Field>
          <div className="flex items-end">
            <Button type="submit" size="md">Create statement</Button>
          </div>
        </form>
      </Card>

      <section>
        <h2 className="h-tight text-[17px]">Your statements</h2>
        {docs.length === 0 ? (
          <div className="mt-3"><Empty icon="✍️" title="Nothing here yet">
            Create your first statement above. If you already have one written, create the document
            and paste it in. The score is more useful than the draft.
          </Empty></div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {docs.map((d) => (
              <Link key={d.id} href={`/app/sop/${d.id}`} className="flex items-center justify-between gap-4 rounded-xl border border-line bg-panel px-4 py-3.5 hover:border-brand-400">
                <div className="min-w-0">
                  <div className="truncate text-[14.5px] font-semibold text-ink">{d.title}</div>
                  <div className="mt-0.5 text-[12.5px] text-muted">
                    {country(d.country).flag} {country(d.country).name} · {d.versions} version{d.versions === 1 ? "" : "s"} ·
                    updated {new Date(d.updated_at).toLocaleDateString()}
                  </div>
                </div>
                {d.latest_score !== null
                  ? <Chip tone={d.latest_score >= 70 ? "teal" : d.latest_score >= 50 ? "gold" : "danger"}>{d.latest_score}/100</Chip>
                  : <Chip tone="grey">Not scored</Chip>}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
