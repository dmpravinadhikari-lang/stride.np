/**
 * Generates the featured image for each guide.
 *
 *   npm run blog:images
 *
 * One template, so the set reads as a series rather than five unrelated
 * pictures. These were the last place the old teal-and-cyan brand survived
 * the rename: a dark teal ground with a cyan dot beside the wordmark, sitting
 * at the top of every guide and in every share.
 *
 * They are now what the guidelines draw on a dark surface: a flat Night Navy
 * ground with no gradient on it, the ridge along the foot at full colour -
 * the one place the three brand colours are allowed to sit as large flat
 * shapes outside the mark - a Summit Yellow rule under the eyebrow, and the
 * bell cropped into the corner at eight percent.
 *
 * A note on the type. These are referenced as <img src="...svg">, so the page's
 * web fonts do not reach inside them and Outfit is not available. The stack
 * below asks for it in case a reader has it installed and falls back to the
 * platform's own geometric sans, which is why the layout leans on the ridge,
 * the rule and the crop rather than on the typeface to look like OfficeYak.
 *
 * These are the in-article images. Facebook, LinkedIn and X do not accept SVG
 * for link previews, so the share cards are real PNGs rendered at build time
 * by src/app/blog/[slug]/opengraph-image.tsx, from the same recipe.
 */
import { writeFileSync, mkdirSync } from "node:fs";

const NAVY = "#15133A";
const PINK = "#F0407A";
const ORANGE = "#FF7A1A";
const YELLOW = "#FFC526";
const MIST = "#B9B8CC";

const FONTS = "Outfit, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

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

  // For the consultancy, rather than for the student. Same template, because
  // an owner who has read a student guide should recognise the series.
  { slug: "start-education-consultancy-nepal", eyebrow: "Starting out",
    lines: ["Registering,", "in order"] },
  { slug: "university-representation-agreement-nepal", eyebrow: "Partnerships",
    lines: ["Your first", "agreement"] },
  { slug: "how-education-agent-commission-works", eyebrow: "Money",
    lines: ["How commission", "really works"] },
  { slug: "why-student-leads-go-quiet", eyebrow: "Operations",
    lines: ["Why enquiries", "go quiet"] },
  { slug: "hiring-paying-counsellors-nepal", eyebrow: "Team",
    lines: ["Hiring", "counsellors"] },
  { slug: "running-multiple-branches-consultancy", eyebrow: "Operations",
    lines: ["The second", "branch"] },
  { slug: "improve-visa-success-rate-consultancy", eyebrow: "Applications",
    lines: ["Raising your", "success rate"] },
  { slug: "when-a-destination-changes-its-rules", eyebrow: "Strategy",
    lines: ["When the rules", "change"] },
  { slug: "education-consultancy-software-what-matters", eyebrow: "Software",
    lines: ["Choosing", "the software"] },
  { slug: "student-records-you-must-keep", eyebrow: "Compliance",
    lines: ["What to keep,", "what to delete"] },
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The ridge, drawn to sit along the bottom edge of a 1200x630 card. */
const ridge = (y: number, h: number) => `
  <g transform="translate(0 ${y}) scale(3 ${h / 80})">
    <polygon points="0,80 60,30 120,80" fill="${PINK}"/>
    <polygon points="80,80 160,10 240,80" fill="${ORANGE}"/>
    <polygon points="200,80 270,26 340,80" fill="${YELLOW}"/>
    <polygon points="300,80 360,40 400,64 400,80" fill="${PINK}" opacity="0.8"/>
  </g>`;

/**
 * The bell as a watermark, cropped by the right edge rather than by the top,
 * so what remains still reads as a bell instead of as an unexplained shape.
 */
const watermark = `
  <g transform="translate(1000 46) scale(5.2)" fill="#FFFFFF" opacity="0.06">
    <rect x="28" y="4" width="8" height="10" rx="3"/>
    <path d="M18 18 Q32 10 46 18 L52 44 L12 44 Z"/>
    <path d="M18 18 Q32 10 46 18 L48 30 L16 30 Z" opacity="0.55"/>
    <rect x="8" y="42" width="48" height="8" rx="4"/>
    <circle cx="32" cy="55" r="5"/>
  </g>`;

/**
 * The lockup at the foot. The bell is drawn rather than set, so the card is
 * recognisably OfficeYak even where Outfit is missing and the wordmark falls
 * back to whatever geometric sans the reader's machine has.
 */
const lockup = (x: number, y: number) => `
  <g transform="translate(${x} ${y})" font-family="${FONTS}">
    <g transform="scale(0.5)">
      <rect x="28" y="4" width="8" height="10" rx="3" fill="#FFFFFF"/>
      <path d="M18 18 Q32 10 46 18 L52 44 L12 44 Z" fill="${ORANGE}"/>
      <path d="M18 18 Q32 10 46 18 L48 30 L16 30 Z" fill="${PINK}"/>
      <rect x="8" y="42" width="48" height="8" rx="4" fill="${YELLOW}"/>
      <circle cx="32" cy="55" r="5" fill="#FFFFFF"/>
    </g>
    <text x="42" y="27" fill="#FFFFFF" font-size="28" font-weight="600" letter-spacing="-1">OfficeYak</text>
  </g>`;

function svg(post: Post): string {
  const size = post.lines.some((l) => l.length > 16) ? 74 : 86;
  const body = post.lines
    .map((line, i) =>
      `<text x="80" y="${296 + i * (size + 14)}" fill="#FFFFFF" font-size="${size}" font-weight="600" letter-spacing="-3">${esc(line)}</text>`)
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${esc(post.lines.join(" "))}">
  <rect width="1200" height="630" fill="${NAVY}"/>
  ${watermark}
  ${ridge(500, 130)}

  ${lockup(80, 448)}

  <g font-family="${FONTS}">
    <text x="80" y="114" fill="${MIST}" font-size="21" font-weight="500" letter-spacing="4.2">${esc(post.eyebrow.toUpperCase())}</text>
    <rect x="80" y="142" width="62" height="4" rx="2" fill="${YELLOW}"/>
    ${body}

    <text x="1120" y="470" fill="${MIST}" font-size="20" font-weight="400" text-anchor="end">Written for Nepali students</text>
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
