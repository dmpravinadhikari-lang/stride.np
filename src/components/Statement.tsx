/**
 * A single line, large, between sections.
 *
 * Used sparingly. Three on the homepage. Each one has to earn its size by
 * carrying a fact, not a slogan. A big sentence that says nothing is worse than
 * no sentence, because the reader learns the big text is safe to skip.
 */
export function Statement({
  children, source, tone = "ink",
}: { children: React.ReactNode; source?: string; tone?: "ink" | "wash" }) {
  const dark = tone === "ink";
  return (
    <section className={dark ? "bg-ink" : "band-tint border-y border-line"}>
      <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:py-20">
        <p className={`display text-[27px] leading-[1.18] sm:text-[40px] ${dark ? "text-white" : "text-ink"}`}>
          {children}
        </p>
        {source && (
          <p className={`mt-5 text-[12.5px] ${dark ? "text-white/50" : "text-muted"}`}>{source}</p>
        )}
      </div>
    </section>
  );
}
