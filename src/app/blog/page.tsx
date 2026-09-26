import Link from "next/link";
import type { Metadata } from "next";
import { allPosts } from "@/lib/blog";
import { BRAND } from "@/lib/brand";
import { Ridge } from "@/components/Logo";
import { SiteHeader, SiteFooter, CtaBand } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: `Guides, ${BRAND.name}`,
  description:
    "The NOC, student visas for Australia, the UK, the USA and Canada, statements of purpose, and what to do after a refusal. Written for Nepal, with the figures and the official source.",
  alternates: { canonical: "/blog" },
};

/**
 * The guides index.
 *
 * It used to sit on a pale blue-to-yellow wash left over from the old brand,
 * with its heading centred over three lines of centred body copy. The layout
 * rule allows centring only for a single-line section intro, and the colour
 * rule allows a gradient only as a thin rule or a soft glow and never behind
 * text, so both had to go. What replaces them is the page rhythm the rest of
 * the site uses: a Paper hero with the ridge across its foot, then a Mist
 * band of cards, the yellow call to action, and the Navy footer.
 */
export default function BlogIndex() {
  const posts = allPosts();
  const [lead, ...rest] = posts;

  const checked = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="bg-canvas">
      <SiteHeader />

      <section className="relative overflow-hidden bg-canvas">
        <div className="relative z-10 mx-auto flex max-w-[1200px] flex-col gap-2.5 px-6 pb-28 pt-14 md:pt-20">
          <span className="self-start rounded-md bg-tint-orange px-2.5 py-1.5 text-[12px] font-medium uppercase tracking-[0.5px] text-tint-orange-ink">
            Guides
          </span>
          <h1 className="display max-w-[760px] text-[clamp(34px,4.2vw,52px)] leading-[1.05] tracking-[-0.035em] text-ink">
            The parts nobody explains properly.
          </h1>
          <p className="max-w-[560px] text-[18px] leading-[1.5] text-ink-2">
            The real figures, the real process, and the mistakes that cost an intake. Send a family
            the link instead of saying it again. Every guide is dated and sourced.
          </p>
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0">
          <Ridge height={96} />
        </div>
      </section>

      <section className="bg-wash">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-6 py-14 md:py-24">
          {/*
            The newest guide is not the same size as the other four. A grid of
            five identical cards says only that there are five; making one the
            lead says which one to read first, which is the whole job of an
            index page.
          */}
          {lead && (
            <Link
              href={`/blog/${lead.slug}`}
              className="group grid gap-6 overflow-hidden rounded-2xl border border-line bg-panel transition-colors hover:border-brand-400 md:grid-cols-[1.1fr_1fr] md:gap-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lead.featuredImage} alt={lead.featuredImageAlt}
                width={1200} height={630}
                className="h-full w-full object-cover"
              />
              <div className="flex flex-col justify-center gap-3 p-7 md:p-9">
                <span className="text-[12px] font-medium uppercase tracking-[0.5px] text-brand-600">
                  {lead.category} · {lead.readingTime}
                </span>
                <h2 className="display text-[clamp(22px,2.2vw,30px)] leading-[1.15] tracking-[-0.03em] text-ink">
                  {lead.title}
                </h2>
                <p className="text-[15px] leading-[1.55] text-ink-2">{lead.metaDescription}</p>
                <span className="mt-1 text-[13px] text-muted">Checked {checked(lead.updatedOn)}</span>
                <span className="mt-1 text-[15px] font-semibold text-brand-600 group-hover:underline">
                  Read the guide →
                </span>
              </div>
            </Link>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {rest.map((post) => (
              <Link
                key={post.slug} href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-panel transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-brand-400"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.featuredImage} alt={post.featuredImageAlt}
                  width={1200} height={630}
                  className="w-full border-b border-wash"
                />
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <span className="text-[12px] font-medium uppercase tracking-[0.5px] text-brand-600">
                    {post.category} · {post.readingTime}
                  </span>
                  <h2 className="text-[17px] font-semibold leading-snug text-ink group-hover:text-brand-600">
                    {post.title}
                  </h2>
                  <p className="flex-1 text-[14px] leading-[1.5] text-ink-2">{post.metaDescription}</p>
                  <span className="text-[12.5px] text-muted">Checked {checked(post.updatedOn)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaBand action="Start free">
        Every guide here is something the Yak already does for you.
      </CtaBand>

      <SiteFooter />
    </main>
  );
}
