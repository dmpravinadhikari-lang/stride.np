import { readFileSync, readdirSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

/**
 * The blog reads plain markdown files out of /content/blog. No database and no
 * CMS: a counsellor edits a file, and the post, its metadata, its schema and
 * its sitemap entry all follow from the same front matter.
 */
const DIR = join(process.cwd(), "content/blog");

export type Faq = { q: string; a: string };
export type Source = { label: string; url: string };

export type PostMeta = {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  category: string;
  author: string;
  authorRole: string;
  reviewedBy: string;
  reviewedOn: string;
  updatedOn: string;
  readingTime: string;
  featuredImage: string;
  featuredImageAlt: string;
  internalLinks: string[];
  sources: Source[];
  faq: Faq[];
  /**
   * Absent means published. The posts written before review existed stay live
   * without needing to be touched.
   */
  status?: "draft" | "scheduled" | "published";
  /** ISO date. Only meaningful while status is "scheduled". */
  publishAt?: string;
};

export type Post = PostMeta & { html: string; markdown: string };

function parse(file: string): Post {
  const raw = readFileSync(join(DIR, file), "utf8");
  const { data, content } = matter(raw);
  const meta = data as PostMeta;
  return {
    ...meta,
    status: meta.status ?? "published",
    secondaryKeywords: meta.secondaryKeywords ?? [],
    internalLinks: meta.internalLinks ?? [],
    sources: meta.sources ?? [],
    faq: meta.faq ?? [],
    markdown: content,
    html: marked.parse(content, { async: false }) as string,
  };
}

/** Every file on disk, drafts included. For the admin console only. */
export function everyPost(): Post[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .map(parse)
    .sort((a, b) => (a.updatedOn < b.updatedOn ? 1 : -1));
}

/** A scheduled post becomes public the moment its date passes. */
export const isLive = (p: Post): boolean =>
  p.status === "published" ||
  (p.status === "scheduled" && Boolean(p.publishAt) && new Date(p.publishAt!) <= new Date());

/**
 * What the public sees. Drafts never appear here, which is the whole point of
 * the review step, an unread guide about visa thresholds is a liability.
 */
export function allPosts(): Post[] {
  return everyPost().filter(isLive);
}

/** Reads a post whatever its status. The admin review screen needs drafts. */
export function readPost(slug: string): Post | null {
  try {
    return parse(`${slug}.md`);
  } catch {
    return null;
  }
}

/** Public lookup: a draft is a 404, exactly as if it did not exist. */
export function getPost(slug: string): Post | null {
  const post = readPost(slug);
  return post && isLive(post) ? post : null;
}

/** Only live slugs, so a draft is never pre-rendered into the build. */
export const postSlugs = () => allPosts().map((p) => p.slug);

/**
 * Article + FAQPage, which is what earns rich results and what AI assistants
 * read most reliably. Emitted per post from the same front matter.
 */
export function postSchema(post: Post, siteUrl: string) {
  const url = `${siteUrl}/blog/${post.slug}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.metaDescription,
      image: `${siteUrl}${post.featuredImage}`,
      datePublished: post.reviewedOn,
      dateModified: post.updatedOn,
      // A byline that names the organisation must not be declared a Person, 
      // search engines treat mismatched structured data as a quality signal
      // against the page. A real counsellor's name, set from the admin panel,
      // gets the Person type and the job title that goes with it.
      author: post.author.toLowerCase().includes("team")
        ? { "@type": "Organization", name: post.author, url: siteUrl }
        : { "@type": "Person", name: post.author, jobTitle: post.authorRole },
      publisher: {
        "@type": "EducationalOrganization",
        name: "Stride",
        url: siteUrl,
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      inLanguage: "en",
      about: post.primaryKeyword,
    },
    post.faq.length > 0 && {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Guides", item: `${siteUrl}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ].filter(Boolean);
}


// ---------------------------------------------------------------------------
// Writing. A generated draft is a markdown file like any other, so a counsellor
// can edit it in the same way and nothing about the publishing path changes.
// ---------------------------------------------------------------------------

export function slugExists(slug: string): boolean {
  return readdirSync(DIR).includes(`${slug}.md`);
}

export function uniqueSlug(base: string): string {
  const clean = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "post";
  if (!slugExists(clean)) return clean;
  let n = 2;
  while (slugExists(`${clean}-${n}`)) n += 1;
  return `${clean}-${n}`;
}

/** Writes a new markdown file and returns its slug. */
export function writePost(meta: PostMeta, markdown: string): string {
  const slug = meta.slug;
  writeFileSync(join(DIR, `${slug}.md`), matter.stringify(markdown, meta as unknown as object), "utf8");
  return slug;
}

/**
 * Rewrites only the front matter of an existing post, leaving the body exactly
 * as it was. Used by approve, schedule and take-down.
 */
export function patchFrontMatter(slug: string, patch: Partial<PostMeta>): boolean {
  const file = join(DIR, `${slug}.md`);
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return false;
  }
  const { data, content } = matter(raw);
  const next = { ...(data as object), ...patch, updatedOn: new Date().toISOString().slice(0, 10) };
  writeFileSync(file, matter.stringify(content, next), "utf8");
  return true;
}

export function deletePostFile(slug: string): boolean {
  try {
    unlinkSync(join(DIR, `${slug}.md`));
    return true;
  } catch {
    return false;
  }
}
