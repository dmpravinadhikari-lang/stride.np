import Link from "next/link";
import { allPosts } from "@/lib/blog";
import { LinkButton } from "@/components/ui";

/** Category colour, so a row of guides is scannable rather than a wall of text. */
const TINT: Record<string, string> = {
  "Canada": "bg-tint-sky text-tint-sky-ink",
  "Nepal process": "bg-tint-lilac text-tint-lilac-ink",
  "Refusals": "bg-tint-rose text-tint-rose-ink",
  "SOP": "bg-tint-peach text-tint-peach-ink",
  "USA": "bg-tint-amber text-tint-amber-ink",
  "Australia": "bg-tint-mint text-tint-mint-ink",
  "UK": "bg-tint-sky text-tint-sky-ink",
  "Money": "bg-tint-lilac text-tint-lilac-ink",
  "Tests": "bg-tint-rose text-tint-rose-ink",
  "Visa": "bg-tint-peach text-tint-peach-ink",
  "Applying": "bg-tint-amber text-tint-amber-ink",
  "Choosing": "bg-tint-mint text-tint-mint-ink",
};

export function LatestGuides({ limit = 3 }: { limit?: number }) {
  const posts = allPosts().slice(0, limit);
  if (posts.length === 0) return null;

  return (
    <section className="band-soft border-y border-line">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <div className="eyebrow">Guides</div>
            <h2 className="display mt-3 text-[30px] sm:text-[38px]">
              Something to hand the family.
            </h2>
            <p className="mt-3 text-[16px] leading-relaxed text-ink-2">
              The figures and the timings, written out properly, every one citing its official
              source. Send the link instead of repeating yourself.
            </p>
          </div>
          <LinkButton href="/blog" variant="secondary" size="md">All guides →</LinkButton>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`}
              className="lift group flex flex-col rounded-[20px] border border-line bg-panel p-6 hover:border-brand-400">
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${TINT[p.category] ?? "bg-wash text-muted"}`}>
                  {p.category}
                </span>
                <span className="text-[12px] text-muted">{p.readingTime}</span>
              </div>
              <h3 className="h-tight mt-3 text-[18px] leading-snug group-hover:text-brand-600">{p.title}</h3>
              <p className="mt-2 flex-1 text-[14px] leading-relaxed text-muted">{p.metaDescription}</p>
              <span className="mt-4 text-[12.5px] font-semibold text-brand-600">Read it →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
