import { ImageResponse } from "next/og";
import { getPost, postSlugs } from "@/lib/blog";

/**
 * The social preview image, rendered as a real PNG.
 *
 * Facebook, LinkedIn and X do not accept SVG for link previews, so the SVG
 * featured image cannot double as the OG image. This generates a PNG per post
 * at build time, from the same palette.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "OfficeYak, guides for Nepali students";

export function generateStaticParams() {
  return postSlugs().map((slug) => ({ slug }));
}

// The share card is the one surface that is all dark ground, which is where
// the signature cyan earns its keep: 9.3:1 against the gradient behind it.
const GROUND = "#001619";
const GROUND_LIFT = "#04323A";
const ACCENT = "#50E8F4";
const MIST = "#93C4CB";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", padding: "72px 80px",
          background: `linear-gradient(135deg, ${GROUND} 0%, ${GROUND_LIFT} 100%)`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: MIST, fontSize: 22, letterSpacing: 4, textTransform: "uppercase", display: "flex" }}>
            {post?.category ?? "Guides"}
          </div>
          <div style={{ width: 62, height: 4, background: ACCENT, marginTop: 20 }} />
          <div
            style={{
              color: "white", fontSize: post && post.title.length > 58 ? 58 : 70,
              fontWeight: 700, lineHeight: 1.1, marginTop: 34, letterSpacing: -2,
              display: "flex", maxWidth: 940,
            }}
          >
            {post?.title ?? "Guides for Nepali students"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <div style={{ color: "white", fontSize: 38, fontWeight: 700, letterSpacing: -1, display: "flex" }}>
              OfficeYak
            </div>
            <div style={{ width: 13, height: 13, borderRadius: 13, background: ACCENT, marginLeft: 7, marginBottom: 8 }} />
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
