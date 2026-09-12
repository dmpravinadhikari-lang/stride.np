import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost, postSchema, postSlugs } from "@/lib/blog";
import { BRAND } from "@/lib/brand";
import { currentBrand } from "@/lib/tenancy/branch";
import { Logo } from "@/components/Logo";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;

/**
 * The slugs to build.
 *
 * These used to be served straight from the edge as static HTML. They are not
 * any more: the header now carries the consultancy's name, which is read from
 * the request's host, so a guide opened at happypanda.stride.np is not the same
 * document as the one opened at the apex and cannot be one cached file. Keeping
 * this means the slug list is still enumerated; if the edge caching matters
 * more than the name in the header on guides specifically, the header on this
 * route is the thing to change back.
 */
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
      siteName: (await currentBrand())?.name ?? BRAND.name,
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
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postSchema(post, SITE)) }}
      />

      <header className="border-b border-line bg-white/85">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Logo />
          <Link href="/signup" className="inline-flex min-h-11 items-center rounded-full bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600 sm:min-h-0 sm:px-4 sm:py-2">
            Start free
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-12">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12.5px] text-muted">
          <Link href="/" className="inline-flex min-h-11 items-center pr-1 hover:text-brand-600 sm:min-h-0">Home</Link>
          <span>/</span>
          <Link href="/blog" className="inline-flex min-h-11 items-center px-1 hover:text-brand-600 sm:min-h-0">Guides</Link>
        </nav>

        <span className="eyebrow mt-5 block">{post.category}</span>
        <h1 className="display mt-3 text-[34px] sm:text-[42px]">{post.title}</h1>

        {/* Named author and a visible review date. Visa and money content is held
            to a higher standard, and this is the cheapest part of meeting it. */}
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-y border-line py-3.5 text-[13px] text-muted">
          <span><strong className="font-semibold text-ink">{post.author}</strong>, {post.authorRole}</span>
          {post.reviewedBy && <span>Reviewed by {post.reviewedBy}</span>}
          <span>Last checked {reviewed}</span>
          <span>{post.readingTime}</span>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.featuredImage}
          alt={post.featuredImageAlt}
          width={1200}
          height={630}
          className="mt-7 w-full rounded-2xl border border-line"
        />

        <div
          className="prose-stride mt-9"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />

        {post.faq.length > 0 && (
          <section className="mt-12 border-t border-line pt-8">
            <h2 className="h-tight text-[24px]">Common questions</h2>
            <dl className="mt-5 flex flex-col divide-y divide-line">
              {post.faq.map((f) => (
                <div key={f.q} className="py-4">
                  <dt className="h-tight text-[16px]">{f.q}</dt>
                  <dd className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {post.sources.length > 0 && (
          <section className="mt-10 rounded-2xl border border-line bg-wash/60 px-5 py-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Sources</h2>
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

        <aside className="mt-10 rounded-2xl border border-brand-200 bg-brand-50 px-6 py-6 text-center">
          <h2 className="h-tight text-[20px]">Put this into practice</h2>
          <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-2">
            Stride runs mock visa interviews on your own file, scores your statement the way an
            assessor would, and tells you which document is missing before a deadline does.
          </p>
          <Link href="/signup" className="mt-5 inline-block rounded-full bg-brand-500 px-6 py-3 text-[15px] font-semibold text-white hover:bg-brand-600">
            Start free →
          </Link>
        </aside>
      </article>
    </main>
  );
}
