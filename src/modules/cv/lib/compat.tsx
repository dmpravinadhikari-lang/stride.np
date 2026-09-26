import { COUNTRIES, COUNTRY_CODES } from "@/lib/countries";
import { countCompleted } from "@/components/CountVisit";

/**
 * The few things the ported CV builder expected from its old home, supplied
 * from OfficeYak's own data instead.
 *
 * Keeping them here rather than editing the builder in five places means the
 * builder stays close to its original, which makes it far easier to pull
 * across a later fix from the other codebase.
 */

/** The destination list the builder renders, from OfficeYak's own countries. */
export const destinations = COUNTRY_CODES.map((code) => ({
  code,
  name: COUNTRIES[code].name,
  short: COUNTRIES[code].name,
  slug: code.toLowerCase(),
  flag: COUNTRIES[code].flag,
}));

/** A flag, from the country table rather than an image. */
export function Flag({ code }: { code: string }) {
  const c = COUNTRIES[code as keyof typeof COUNTRIES];
  return <span aria-hidden>{c?.flag ?? "🌐"}</span>;
}

/**
 * The builder fires named events at each step. OfficeYak counts free-tool use
 * anonymously and nothing else, so everything except a finished CV is
 * deliberately dropped on the floor rather than quietly recorded.
 */
export function track(event: string, _detail?: Record<string, string | number>): void {
  if (event.startsWith("cv_download")) countCompleted("cv-maker");
}
