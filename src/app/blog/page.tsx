import Link from "next/link";
import type { Metadata } from "next";
import { allPosts } from "@/lib/blog";
import { BRAND } from "@/lib/brand";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: `Guides, ${BRAND.name}`,
  description:
    "The NOC, student visas for Australia, the UK, the USA and Canada, statements of purpose, and what to do after a refusal. Written for Nepal, with the figures and the official source.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  const posts = allPosts();

  return (
    <main>
      <header className="border-b border-line bg-white/85">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Logo />
          <Link href="/signup" className="inline-flex min-h-11 items-center rounded-full bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600 sm:min-h-0 sm:px-4 sm:py-2">
            Start free
          </Link>
        </div>
      </header>

      <section className="wash border-b border-line">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <span className="eyebrow">Guides</span>
          <h1 className="display mt-4 text-[38px] sm:text-[46px]">
            The parts nobody explains properly.
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-[17px] leading-relaxed text-ink-2">
            The real figures, the real process, and the mistakes that cost an intake. Send a family
            the link instead of saying it again. Every guide is dated and sourced.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-14">
        <div className="grid gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <article key={post.slug} className="overflow-hidden rounded-2xl border border-line bg-panel transition-colors hover:border-brand-400">
              <Link href={`/blog/${post.slug}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.featuredImage}
                  alt={post.featuredImageAlt}
                  width={1200}
                  height={630}
                  className="w-full border-b border-line"
                />
                <div className="p-5">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">
                    {post.category}
                    <span className="text-muted">· {post.readingTime}</span>
                  </div>
                  <h2 className="h-tight mt-2.5 text-[19px] leading-snug">{post.title}</h2>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted">{post.metaDescription}</p>
                  <p className="mt-3 text-[12px] text-muted">
                    Checked {new Date(post.updatedOn).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
