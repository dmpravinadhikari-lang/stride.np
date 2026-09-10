import Link from "next/link";
import { requireCapability } from "@/lib/auth/guard";
import { allTestimonials, exampleCount, TINTS } from "@/modules/testimonials/data";
import { createTestimonial, deleteTestimonial, toggleTestimonial, clearExamples } from "@/modules/testimonials/actions";
import { Avatar } from "@/components/Avatar";
import { Alert, Button, Card, Chip, Field, inputClass } from "@/components/ui";

export const metadata = { title: "Testimonials, STRIDE" };

export default async function TestimonialsAdmin() {
  await requireCapability("platform:admin");
  const items = allTestimonials();
  const examples = exampleCount();
  const real = items.length - examples;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link href="/app/admin" className="inline-flex min-h-[40px] items-center text-[12.5px] font-semibold text-muted hover:text-brand-600">← Admin console</Link>
        <h1 className="display mt-1.5 text-[28px]">Testimonials</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          What appears in the testimonials band on the homepage. Placeholder examples are labelled
          as such on the public page until you replace them.
        </p>
      </header>

      {examples > 0 && (
        <Alert tone="gold" title={`${examples} placeholder${examples === 1 ? "" : "s"} still showing`}>
          These carry a visible “Example, not a real student” label on the homepage. Add your real
          quotes below, then clear the placeholders in one go.
          <form action={clearExamples} className="mt-3">
            <Button type="submit" variant="secondary" size="sm">Delete all placeholders</Button>
          </form>
        </Alert>
      )}

      <Card className="p-5 sm:p-6">
        <h2 className="h-tight text-[16px]">Add a real testimonial</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          Get permission before publishing a name. First name and last initial is what most students
          agree to, and it is enough to be credible.
        </p>
        <form action={createTestimonial} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Name" name="name" hint="Sujata G.">
            <input id="name" name="name" required className={inputClass} placeholder="Sujata G." />
          </Field>
          <Field label="Who they are" name="role">
            <input id="role" name="role" className={inputClass} placeholder="Student, going to Australia" />
          </Field>
          <Field label="Outcome" name="outcome" hint="Optional, and only if it is true.">
            <input id="outcome" name="outcome" className={inputClass} placeholder="Band 6.0 → 7.5" />
          </Field>
          <Field label="Card colour" name="tint">
            <select id="tint" name="tint" className={inputClass} defaultValue="sky">
              {TINTS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="What they said" name="quote" hint="Two or three sentences in their own words.">
              <textarea id="quote" name="quote" required rows={3} className={inputClass} />
            </Field>
          </div>
          <div><Button type="submit">Publish testimonial</Button></div>
        </form>
      </Card>

      <section>
        <h2 className="h-tight text-[17px]">
          On the site <span className="num text-[13px] font-normal text-muted">· {real} real, {examples} placeholder</span>
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {items.map((t) => (
            <Card key={t.id} className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="flex min-w-0 flex-1 gap-3">
                <Avatar name={t.name} tint={t.tint} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14.5px] font-semibold text-ink">{t.name}</span>
                    {t.is_example === 1 && <Chip tone="gold">Example</Chip>}
                    {t.published === 0 && <Chip tone="grey">Hidden</Chip>}
                    {t.outcome && <Chip tone="teal">{t.outcome}</Chip>}
                  </div>
                  <div className="text-[12.5px] text-muted">{t.role}</div>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">“{t.quote}”</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <form action={toggleTestimonial}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="published" value={t.published === 1 ? "0" : "1"} />
                  <button type="submit" className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-ink-2 hover:border-line-2">
                    {t.published === 1 ? "Hide" : "Show"}
                  </button>
                </form>
                <form action={deleteTestimonial}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-muted hover:text-danger-600">
                    Delete
                  </button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
