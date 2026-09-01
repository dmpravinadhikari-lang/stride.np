import type { MetadataRoute } from "next";
import { allPosts } from "@/lib/blog";
import { BRAND } from "@/lib/brand";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;

/**
 * Built from the content itself, so a new guide adds its own URL and nothing
 * has to be remembered. Only public pages belong here — everything under /app
 * is behind a login and must never be listed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const posts = allPosts().map((post) => ({
    url: `${SITE}/blog/${post.slug}`,
    lastModified: new Date(post.updatedOn),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // The free tools are the main way students arrive, so they belong here too.
  const tools = [
    "/tools", "/tools/eligibility", "/tools/cost", "/tools/loan",
    "/tools/checklist", "/tools/document-checklist", "/tools/universities",
    "/tools/scholarships", "/tools/compare",
  ].map((path) => ({
    url: `${SITE}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: path === "/tools" ? 0.9 : 0.8,
  }));

  return [
    { url: SITE, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    ...tools,
    ...posts,
  ];
}
