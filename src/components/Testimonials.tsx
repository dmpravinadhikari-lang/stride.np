import { Chip, LinkButton } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { publishedTestimonials } from "@/modules/testimonials/data";

/**
 * Example entries render with a visible "Example" label. That is the whole
 * compromise: the section can be populated and designed before real quotes
 * exist, and no reader is led to believe a placeholder is a real student.
 */
export function Testimonials() {
  const items = publishedTestimonials();
  if (items.length === 0) return null;

  const anyExamples = items.some((t) => t.is_example === 1);

  return (
    <section className="band-lilac border-y border-line">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <div className="eyebrow">In their words</div>
            <h2 className="display mt-3 text-[30px] sm:text-[38px]">Students who planned early.</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-ink-2">
              The difference is rarely ability. It is whether somebody made them work out the
              numbers while there was still time to change them.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <figure key={t.id} className="flex flex-col rounded-[20px] border border-line bg-panel p-6">
              {t.is_example === 1 && (
                <div className="mb-3">
                  <Chip tone="gold">Example — not a real student</Chip>
                </div>
              )}
              <blockquote className="flex-1 text-[15px] leading-relaxed text-ink-2">“{t.quote}”</blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                <Avatar name={t.name} tint={t.tint} />
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-ink">{t.name}</span>
                  <span className="block text-[12.5px] text-muted">{t.role}</span>
                </span>
                {t.outcome && (
                  <span className="ml-auto shrink-0 rounded-full bg-tint-mint px-2.5 py-1 text-[11px] font-semibold text-tint-mint-ink">
                    {t.outcome}
                  </span>
                )}
              </figcaption>
            </figure>
          ))}
        </div>

        {anyExamples && (
          <p className="mt-6 text-[12.5px] leading-relaxed text-muted">
            Cards marked <strong className="font-semibold text-ink-2">Example</strong> are placeholder
            copy showing how a real testimonial will look. They are labelled on purpose and are
            deleted from the admin console the moment genuine quotes arrive.
          </p>
        )}

        <div className="mt-8"><LinkButton href="/signup" size="md">Start your own plan</LinkButton></div>
      </div>
    </section>
  );
}
