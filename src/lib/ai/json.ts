/**
 * Models sometimes wrap JSON in prose or a code fence. This digs it out rather
 * than failing the whole request over a stray backtick.
 */
export function extractJson<T>(text: string, fallback: T): T {
  const attempts: string[] = [];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) attempts.push(fenced[1]);
  attempts.push(text);
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    attempts.push(text.slice(firstBrace, lastBrace + 1));
  }
  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate.trim()) as T;
    } catch {
      /* try the next one */
    }
  }
  return fallback;
}
