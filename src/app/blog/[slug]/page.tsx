import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost, postSchema, postSlugs } from "@/lib/blog";
import { BRAND } from "@/lib/brand";
import { Ridge } from "@/components/Logo";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;

/** Static at build time, so Cloudflare can serve every guide from the edge. */
export function generateStaticParams() {
  return postSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  return {
    title: post.metaTitle,
    description: post.metaDescription,
    keywords: [post.primaryKeyword, ...post.secondaryKeywords],
    authors: [{ name: post.author }],
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.metaTitle,
      description: post.metaDescription,
      url: `${SITE}/blog/${post.slug}`,
      siteName: BRAND.name,
      publishedTime: post.reviewedOn,
      modifiedTime: post.updatedOn,
    },
    twitter: { card: "summary_large_image", title: post.metaTitle, description: post.metaDescription },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const reviewed = new Date(post.updatedOn).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <main className="bg-canvas">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postSchema(post, SITE)) }}
      />

      <SiteHeader />

      <article className="mx-auto max-w-[760px] px-6 py-12 md:py-16">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[13px] text-muted">
          <Link href="/" className="inline-flex min-h-11 items-center pr-1 hover:text-brand-600 sm:min-h-0">Home</Link>
          <span aria-hidden>/</span>
          <Link href="/blog" className="inline-flex min-h-11 items-center px-1 hover:text-brand-600 sm:min-h-0">Guides</Link>
        </nav>

        <span className="mt-5 inline-flex rounded-md bg-tint-orange px-2.5 py-1.5 text-[12px] font-medium uppercase tracking-[0.5px] text-tint-orange-ink">
          {post.category}
        </span>
        <h1 className="display mt-4 text-[clamp(30px,3.6vw,44px)] leading-[1.08] tracking-[-0.035em] text-ink">
          {post.title}
        </h1>

        {/* Named author and a visible review date. Visa and money content is held
            to a higher standard, and this is the cheapest part of meeting it. */}
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-y border-line py-3.5 text-[13px] text-muted">
          <span><strong className="font-semibold text-ink">{post.author}</strong>, {post.authorRole}</span>
          {post.reviewedBy && <span>Reviewed by {post.reviewedBy}</span>}
          <span>Last checked {reviewed}</span>
          <span>{post.readingTime}</span>
        </div>

        {/* The imagery rule's frame: 16px radius, one hairline of Mist. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.featuredImage}
          alt={post.featuredImageAlt}
          width={1200}
          height={630}
          className="mt-7 w-full rounded-2xl border border-wash"
        />

        <div
          className="prose-officeyak mt-9"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />

        {post.faq.length > 0 && (
          <section className="mt-12 border-t border-line pt-8">
            <h2 className="display text-[24px] tracking-[-0.03em]">Common questions</h2>
            <dl className="mt-5 flex flex-col divide-y divide-line">
              {post.faq.map((f) => (
                <div key={f.q} className="py-4">
                  <dt className="text-[16px] font-semibold text-ink">{f.q}</dt>
                  <dd className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {post.sources.length > 0 && (
          <section className="mt-10 rounded-2xl border border-line bg-wash px-6 py-5">
            <h2 className="text-[12px] font-medium uppercase tracking-[0.5px] text-muted">Sources</h2>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {post.sources.map((s) => (
                <li key={s.url} className="text-[13.5px]">
                  <a href={s.url} target="_blank" rel="noreferrer noopener" className="text-brand-600 hover:underline">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* The one dark card on the page, which is what a Navy surface is
            for: the ridge along its foot, and the only thing being asked. */}
        <aside className="relative mt-12 overflow-hidden rounded-2xl bg-ink p-7 text-white">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0">
            <Ridge height={70} opacity={0.1} />
          </div>
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-md">
              <h2 className="display text-[22px] leading-[1.2] tracking-[-0.03em]">Put this into practice</h2>
              <p className="mt-2 text-[15px] leading-[1.55] text-[#B9B8CC]">
                OfficeYak runs mock visa interviews on your own file, scores your statement the way
                an assessor would, and tells you which document is missing before a deadline does.
              </p>
            </div>
            <Link
              href="/signup"
              className="inline-flex min-h-[50px] shrink-0 items-center rounded-[10px] bg-brand-500 px-[22px] text-[16px] font-semibold text-ink transition-colors hover:bg-brand-400"
            >
              Start free
            </Link>
          </div>
        </aside>
      </article>

      <SiteFooter />
    </main>
  );
}
