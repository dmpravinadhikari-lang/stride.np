import { runAiJson } from "@/lib/ai/run";
import { LANGUAGE_RULE } from "@/lib/terms";
import type { Scope } from "@/lib/db/scope";

/**
 * Produces a post in the shape the markdown blog already uses — same front
 * matter, same FAQ schema, same source list. A generated draft is therefore
 * indistinguishable from a hand-written one except for its status, which is
 * what lets a counsellor edit it in the normal way.
 */
export type Draft = {
  title: string;
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  category: string;
  readingTime: string;
  markdown: string;
  faq: Array<{ q: string; a: string }>;
  sources: Array<{ label: string; url: string }>;
  internalLinks: string[];
};

const EMPTY: Draft = {
  title: "", metaTitle: "", metaDescription: "", primaryKeyword: "",
  secondaryKeywords: [], category: "Applying", readingTime: "6 min",
  markdown: "", faq: [], sources: [], internalLinks: [],
};

const TOOLS = [
  "/tools/cost", "/tools/loan", "/tools/eligibility", "/tools/checklist",
  "/tools/document-checklist", "/tools/universities", "/tools/scholarships", "/tools/compare",
];

const SYSTEM = `You write guides for Nepali students going abroad, for a platform called Stride.

The standard is a piece worth linking to, not a piece written for a keyword:
- Answer the question in the first two paragraphs. Nobody scrolls to be rewarded later.
- Be concrete: figures, timings, document names, the actual order things happen in.
- Nepali specifics throughout — NOC, bank balance certificate, tax clearance, education loan against land, lalpurja, ward office relationship certificate, lakh and crore.
- Say the uncomfortable thing. If most applications fail on one point, say so.
- NEVER invent a statistic, refusal rate, fee or financial threshold. If a current figure matters and you are not certain of it, describe the requirement and tell the reader to confirm it on the official source. A wrong number here sends a family to the bank with the wrong amount.
- Every source you cite must be an official body — an immigration department, a ministry, an awarding body. Never cite a consultancy blog.
- No filler, no "in today's competitive world", no conclusion that restates the title.
${LANGUAGE_RULE}

The body is GitHub-flavoured markdown: ## and ### headings, short paragraphs, bullet and numbered lists, and tables where a comparison earns one. Do not include the title as an H1 — that is rendered separately.
Link to at least two of these internally, in the prose, with descriptive anchor text: ${TOOLS.join(", ")}.

Return ONLY JSON:
{"title":"...","metaTitle":"under 60 characters","metaDescription":"under 160 characters",
 "primaryKeyword":"...","secondaryKeywords":["..."],"category":"Australia|UK|Canada|USA|Money|Tests|Visa|Applying|Choosing",
 "readingTime":"7 min","markdown":"the full body",
 "faq":[{"q":"...","a":"..."}],
 "sources":[{"label":"official body — page","url":"https://..."}],
 "internalLinks":["/tools/cost"]}`;

export async function generateDraft(
  scope: Scope,
  topic: { title: string; angle: string; category: string },
): Promise<Draft> {
  return runAiJson<Draft>(
    scope,
    {
      module: "blog", action: "blog.draft", tier: "smart", maxTokens: 8000,
      system: SYSTEM,
      prompt: `TOPIC: ${topic.title}\nANGLE: ${topic.angle}\nSUGGESTED CATEGORY: ${topic.category}\n\nWrite the guide.`,
    },
    3,
    EMPTY,
  );
}
