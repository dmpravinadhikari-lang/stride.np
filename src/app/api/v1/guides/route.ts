import { ok } from "@/lib/api/respond";
import { allPosts } from "@/lib/blog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug");
  const posts = allPosts();

  if (slug) {
    const post = posts.find((p) => p.slug === slug);
    if (!post) return ok({ post: null });
    return ok({ post: { ...post, markdown: post.markdown, html: post.html } });
  }

  return ok({
    total: posts.length,
    posts: posts.map((p) => ({
      slug: p.slug, title: p.title, description: p.metaDescription,
      category: p.category, readingTime: p.readingTime, updatedOn: p.updatedOn,
    })),
  });
}
