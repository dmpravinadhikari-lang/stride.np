import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domain}`;

/**
 * AI assistants are named and allowed deliberately. A growing share of "how
 * much does it cost to study in Australia from Nepal" is answered inside a chat
 * assistant and never reaches a results page; the only question is whose
 * figures get quoted.
 */
const AI_CRAWLERS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-Web", "anthropic-ai",
  "PerplexityBot", "Google-Extended", "Applebot-Extended", "CCBot", "Bytespider",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Nothing behind a login, and no account pages, should ever be crawled.
        disallow: ["/app/", "/api/", "/p/", "/login", "/signup"],
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: ["/app/", "/api/", "/p/"],
      })),
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
