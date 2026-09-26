/**
 * Generates the featured image for each blog post.
 *
 *   npm run blog:images
 *
 * One template, so the set reads as a series rather than five unrelated
 * pictures. Palette is the logo's: navy ground, the wordmark's red full stop
 * used as the single accent.
 *
 * These SVGs are the in-article featured images. Facebook, LinkedIn and X do
 * NOT accept SVG for link previews — those are generated as real PNGs at
 * request time by src/app/blog/[slug]/opengraph-image.tsx.
 */
import { writeFileSync, mkdirSync } from "node:fs";

const GROUND = "#001619";
const GROUND_LIFT = "#04323A";
const ACCENT = "#50E8F4";
const MIST = "#93C4CB";

type Post = { slug: string; eyebrow: string; lines: string[] };

const POSTS: Post[] = [
  { slug: "noc-for-abroad-study-nepal", eyebrow: "Nepal · Paperwork",
    lines: ["The NOC,", "start to finish"] },
  { slug: "canada-study-permit-from-nepal", eyebrow: "Canada · Visa",
    lines: ["Canada, now", "that SDS is gone"] },
  { slug: "f1-visa-interview-questions-nepal", eyebrow: "USA · Interview",
    lines: ["Four minutes", "at the window"] },
  { slug: "sop-mistakes-that-get-nepali-students-refused", eyebrow: "SOP · Refusals",
    lines: ["The sentences", "that sink an SOP"] },
  { slug: "student-visa-refused-nepal-what-to-do-next", eyebrow: "Refusal · Next steps",
    lines: ["Refused.", "What now?"] },
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function svg(post: Post): string {
  const size = post.lines.some((l) => l.length > 16) ? 74 : 86;
  const body = post.lines
    .map((line, i) => `<text x="80" y="${300 + i * (size + 14)}" fill="#FFFFFF" font-size="${size}" font-weight="700" letter-spacing="-2.4">${esc(line)}</text>`)
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${esc(post.lines.join(" "))}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${GROUND}"/>
      <stop offset="100%" stop-color="${GROUND_LIFT}"/>
    </linearGradient>
    <pattern id="rule" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(24)">
      <line x1="0" y1="0" x2="0" y2="34" stroke="#FFFFFF" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="1200" height="630" fill="url(#g)"/>
  <rect width="1200" height="630" fill="url(#rule)"/>
  <circle cx="1035" cy="140" r="250" fill="#FFFFFF" fill-opacity="0.03"/>
  <circle cx="1035" cy="140" r="170" fill="#FFFFFF" fill-opacity="0.03"/>

  <g font-family="Archivo, Helvetica Neue, Helvetica, Arial, sans-serif">
    <text x="80" y="118" fill="${MIST}" font-size="21" font-weight="600" letter-spacing="4.2">${esc(post.eyebrow.toUpperCase())}</text>
    <rect x="80" y="146" width="62" height="4" fill="${ACCENT}"/>
    ${body}

    <g transform="translate(80, 548)">
      <text x="0" y="0" fill="#FFFFFF" font-size="34" font-weight="700" letter-spacing="-1.2">OfficeYak</text>
      <circle cx="98" cy="-6" r="7" fill="${ACCENT}"/>
    </g>
    <text x="1120" y="548" fill="${MIST}" font-size="20" font-weight="500" text-anchor="end">Written for Nepali students</text>
  </g>
</svg>
`;
}

mkdirSync("public/blog", { recursive: true });
for (const post of POSTS) {
  writeFileSync(`public/blog/${post.slug}.svg`, svg(post));
  console.log(`  public/blog/${post.slug}.svg`);
}
console.log(`\n${POSTS.length} featured images written.`);
