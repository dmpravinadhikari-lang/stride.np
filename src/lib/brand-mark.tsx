/**
 * One definition of the app icon, rendered at whatever size a route needs.
 * Keeping it here rather than repeating the markup in five route files means
 * the launcher icon, the splash icon and the favicon cannot drift apart.
 *
 * The brand book sets the recipe exactly: a Navy tile, the bell at 64% of it,
 * and the ridge in white at 8% along the base. Below 48px the bell's own
 * details close up, so the favicon shows the horn-Y instead, which is the one
 * part of the mark that survives at 16px.
 *
 * These routes render through Satori, which draws a subset of CSS and no
 * inline SVG, so each mark is handed over as a data URI. The strings are the
 * files in public/brand, inlined: one copy would otherwise be fetched over
 * the network at image-render time, which Satori cannot do.
 */

const BELL_ON_DARK =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<rect x="28" y="4" width="8" height="10" rx="3" fill="#fff"/>' +
  '<path d="M18 18 Q32 10 46 18 L52 44 L12 44 Z" fill="#FF7A1A"/>' +
  '<path d="M18 18 Q32 10 46 18 L48 30 L16 30 Z" fill="#F0407A"/>' +
  '<rect x="8" y="42" width="48" height="8" rx="4" fill="#FFC526"/>' +
  '<circle cx="32" cy="55" r="5" fill="#fff"/></svg>';

const HORN_Y =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 62">' +
  '<path d="M32 33 C30 24 21 17 9 8" fill="none" stroke="#F0407A" stroke-width="15" stroke-linecap="round"/>' +
  '<path d="M32 33 C34 24 43 17 55 8" fill="none" stroke="#FFC526" stroke-width="15" stroke-linecap="round"/>' +
  '<rect x="24" y="30" width="16" height="32" rx="7" fill="#FF7A1A"/>' +
  '<circle cx="32" cy="33" r="7.5" fill="#fff"/></svg>';

const RIDGE_WHITE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80" preserveAspectRatio="none">' +
  '<polygon points="0,80 60,30 120,80" fill="#fff"/>' +
  '<polygon points="80,80 160,10 240,80" fill="#fff" opacity="0.8"/>' +
  '<polygon points="200,80 270,26 340,80" fill="#fff" opacity="0.6"/></svg>';

const uri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export function officeYakMark(size: number, { maskable = false }: { maskable?: boolean } = {}) {
  // A maskable icon may lose everything outside the middle 80%, so the mark
  // sits smaller and the Navy runs to the edges to be cropped.
  const markSize = size * (maskable ? 0.52 : 0.64);
  // The brand book's app icon corner, and none at all when it will be masked.
  const radius = maskable ? 0 : size * 0.28;
  const small = size < 48;

  return (
    <div
      style={{
        width: "100%", height: "100%", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "#15133A", borderRadius: radius, position: "relative",
        overflow: "hidden",
      }}
    >
      {/* The ridge along the base, at the stated 8%. */}
      {!small && (
        <img
          src={uri(RIDGE_WHITE)} width={size} height={size * 0.22}
          style={{ position: "absolute", left: 0, bottom: 0, opacity: 0.08 }}
        />
      )}
      <img
        src={uri(small ? HORN_Y : BELL_ON_DARK)}
        width={markSize}
        height={small ? markSize * 0.97 : markSize}
      />
    </div>
  );
}
