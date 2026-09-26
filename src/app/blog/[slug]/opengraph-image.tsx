import { ImageResponse } from "next/og";
import { getPost, postSlugs } from "@/lib/blog";

/**
 * The social preview image, rendered as a real PNG.
 *
 * Facebook, LinkedIn and X do not accept SVG for link previews, so the SVG
 * featured image cannot double as the share card. This renders a PNG per
 * guide at build time, from the same recipe as scripts/blog-images.ts: flat
 * Night Navy with no gradient on it, the ridge along the foot at full colour,
 * a Summit Yellow rule under the category, and the bell cropped by the right
 * edge at six percent.
 *
 * It was the teal ground and cyan dot of the brand before this one, which
 * meant every guide shared into a Viber group still wore the old company.
 *
 * Satori draws a subset of CSS and no inline SVG, so each piece of artwork is
 * handed over as a data URI rather than as markup.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "OfficeYak, guides for Nepali students";

export function generateStaticParams() {
  return postSlugs().map((slug) => ({ slug }));
}

const NAVY = "#15133A";
const YELLOW = "#FFC526";
const MIST = "#B9B8CC";

const RIDGE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80" preserveAspectRatio="none">' +
  '<polygon points="0,80 60,30 120,80" fill="#F0407A"/>' +
  '<polygon points="80,80 160,10 240,80" fill="#FF7A1A"/>' +
  '<polygon points="200,80 270,26 340,80" fill="#FFC526"/>' +
  '<polygon points="300,80 360,40 400,64 400,80" fill="#F0407A" opacity="0.8"/></svg>';

const BELL = (fill: string, opacity = 1) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" opacity="${opacity}">` +
  `<rect x="28" y="4" width="8" height="10" rx="3" fill="${fill === "brand" ? "#fff" : fill}"/>` +
  `<path d="M18 18 Q32 10 46 18 L52 44 L12 44 Z" fill="${fill === "brand" ? "#FF7A1A" : fill}"/>` +
  `<path d="M18 18 Q32 10 46 18 L48 30 L16 30 Z" fill="${fill === "brand" ? "#F0407A" : fill}"/>` +
  `<rect x="8" y="42" width="48" height="8" rx="4" fill="${fill === "brand" ? "#FFC526" : fill}"/>` +
  `<circle cx="32" cy="55" r="5" fill="${fill === "brand" ? "#fff" : fill}"/></svg>`;

const uri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  const title = post?.title ?? "Guides for Nepali students";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", padding: "72px 80px",
          background: NAVY, position: "relative",
        }}
      >
        {/* The bell, cropped by the right edge rather than the top, so what
            is left of it still reads as a bell. */}
        <img
          src={uri(BELL("#ffffff", 0.06))} width={330} height={330}
          style={{ position: "absolute", right: -80, top: 46 }}
        />
        <img
          // 110 rather than 130: the footer row is pinned to the bottom of
          // the card, and a taller ridge puts the wordmark on the pink peak.
          src={uri(RIDGE)} width={1200} height={110}
          style={{ position: "absolute", left: 0, bottom: 0 }}
        />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: MIST, fontSize: 22, letterSpacing: 4, textTransform: "uppercase", display: "flex" }}>
            {post?.category ?? "Guides"}
          </div>
          <div style={{ width: 62, height: 4, borderRadius: 2, background: YELLOW, marginTop: 20 }} />
          <div
            style={{
              color: "white", fontSize: title.length > 58 ? 58 : 70,
              fontWeight: 600, lineHeight: 1.1, marginTop: 34, letterSpacing: -2.4,
              display: "flex", maxWidth: 900,
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src={uri(BELL("brand"))} width={38} height={38} />
            <div style={{ color: "white", fontSize: 34, fontWeight: 600, letterSpacing: -1.2, marginLeft: 11, display: "flex" }}>
              OfficeYak
            </div>
          </div>
          <div style={{ color: MIST, fontSize: 21, display: "flex" }}>
            Written for Nepali students
          </div>
        </div>
      </div>
    ),
    size,
  );
}
