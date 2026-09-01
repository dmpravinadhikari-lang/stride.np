/**
 * Auto-marking for listening and reading.
 *
 * IELTS accepts spelling variants and ignores articles, so marking must too —
 * a student who wrote "the museum" for "museum" got it right, and telling them
 * otherwise teaches them nothing except to distrust the tool.
 */
const ARTICLES = /^(a|an|the)\s+/i;

export function normalise(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?'"()]/g, "")
    .replace(/\s+/g, " ")
    .replace(ARTICLES, "")
    .trim();
}

/** `accepted` holds every answer that scores the mark, e.g. ["12 30", "12.30", "half past twelve"]. */
export function isCorrect(response: string | null | undefined, accepted: string[]): boolean {
  if (!response) return false;
  const given = normalise(response);
  if (!given) return false;
  return accepted.some((a) => {
    const want = normalise(a);
    if (given === want) return true;
    // Numbers written with or without separators: "1200" vs "1,200".
    const digitsGiven = given.replace(/[^0-9]/g, "");
    const digitsWant = want.replace(/[^0-9]/g, "");
    return digitsWant.length > 0 && digitsGiven === digitsWant && /^[0-9.,\s]+$/.test(want);
  });
}
