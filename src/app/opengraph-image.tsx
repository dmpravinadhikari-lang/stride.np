import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

/**
 * The picture that appears when the site is shared.
 *
 * Next applies this to every page that does not draw its own, so one file
 * covers the homepage, the free tools and the legal pages. The guides keep
 * their own, which carries the guide's title.
 *
 * Without it a link pasted into Viber or Facebook showed a bare line of text.
 * In Nepal most of this site will be shared that way rather than found in a
 * search result, so the share card is not decoration.
 *
 * Satori draws no inline SVG, so the artwork is handed over as data URIs.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${BRAND.name}, ${BRAND.oneLiner}`;

const NAVY = "#15133A";
const MIST = "#B9B8CC";

const RIDGE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80" preserveAspectRatio="none">' +
  '<polygon points="0,80 60,30 120,80" fill="#F0407A"/>' +
  '<polygon points="80,80 160,10 240,80" fill="#FF7A1A"/>' +
  '<polygon points="200,80 270,26 340,80" fill="#FFC526"/>' +
  '<polygon points="300,80 360,40 400,64 400,80" fill="#F0407A" opacity="0.8"/></svg>';

const BELL = (mono?: string) =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  `<rect x="28" y="4" width="8" height="10" rx="3" fill="${mono ?? "#fff"}"/>` +
  `<path d="M18 18 Q32 10 46 18 L52 44 L12 44 Z" fill="${mono ?? "#FF7A1A"}"/>` +
  `<path d="M18 18 Q32 10 46 18 L48 30 L16 30 Z" fill="${mono ?? "#F0407A"}"/>` +
  `<rect x="8" y="42" width="48" height="8" rx="4" fill="${mono ?? "#FFC526"}"/>` +
  `<circle cx="32" cy="55" r="5" fill="${mono ?? "#fff"}"/></svg>`;

const uri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", padding: "76px 80px",
          background: NAVY, position: "relative",
        }}
      >
        <img src={uri(BELL("#ffffff"))} width={330} height={330}
          style={{ position: "absolute", right: -80, top: 40, opacity: 0.06 }} />
        <img src={uri(RIDGE)} width={1200} height={110}
          style={{ position: "absolute", left: 0, bottom: 0 }} />

        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={uri(BELL())} width={46} height={46} />
          <div style={{ color: "#fff", fontSize: 40, fontWeight: 600, letterSpacing: -1.4, marginLeft: 13, display: "flex" }}>
            {BRAND.name}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 950 }}>
          <div style={{ color: "#fff", fontSize: 62, fontWeight: 600, lineHeight: 1.08, letterSpacing: -2.2, display: "flex" }}>
            Every branch, carried like your best branch.
          </div>
          <div style={{ color: MIST, fontSize: 26, marginTop: 24, display: "flex" }}>
            {BRAND.oneLiner}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
