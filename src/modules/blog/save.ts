import type { PostMeta } from "@/lib/blog";
import { uniqueSlug, writePost } from "@/lib/blog";
import type { Draft } from "@/modules/blog/generate";

/** Turns a generated draft into a markdown file, unpublished. */
export function saveDraft(draft: Draft, reviewer = ""): string {
  const slug = uniqueSlug(draft.title);
  const today = new Date().toISOString().slice(0, 10);

  const meta: PostMeta = {
    title: draft.title,
    slug,
    metaTitle: draft.metaTitle || draft.title,
    metaDescription: draft.metaDescription,
    primaryKeyword: draft.primaryKeyword,
    secondaryKeywords: draft.secondaryKeywords ?? [],
    category: draft.category || "Applying",
    author: "OfficeYak",
    authorRole: "Drafted by OfficeYak, pending review",
    reviewedBy: reviewer,
    reviewedOn: today,
    updatedOn: today,
    readingTime: draft.readingTime || "6 min",
    featuredImage: `/blog/${slug}.svg`,
    featuredImageAlt: draft.title,
    internalLinks: draft.internalLinks ?? [],
    sources: draft.sources ?? [],
    faq: draft.faq ?? [],
    // The whole point: it lands unpublished.
    status: "draft",
  };

  writePost(meta, draft.markdown);
  return slug;
}
