/**
 * One definition of the app mark, rendered at whatever size an icon route
 * needs. Keeping it here rather than repeating the JSX in four route files
 * means the launcher icon, the splash icon and the favicon cannot drift apart.
 *
 * The three squares are the brand mark: pink is the enquiry, orange is the
 * preparation, yellow is the departure, sized 1 : φ : φ² on a rising diagonal.
 * They are drawn here with divs rather than an SVG because these routes run
 * through Satori, which renders a subset of CSS and no SVG transforms.
 *
 * The tile is Ink Navy: the guidelines forbid the full-colour mark on orange,
 * pink or yellow grounds, and a home screen is exactly where a mark ends up
 * sitting on somebody else's wallpaper if it has no ground of its own.
 */
export function officeYakMark(size: number, { maskable = false }: { maskable?: boolean } = {}) {
  // A maskable icon may lose everything outside the middle 80%, so the mark is
  // drawn inside that circle and the ground runs to the edges to be cropped.
  const scale = maskable ? 0.72 : 0.86;
  const radius = maskable ? 0 : size * 0.28;  // the guidelines' app icon corner

  // Golden ratio, as the mark is built: the smallest square, then φ, then φ².
  const unit = size * 0.13 * scale;
  const squares = [
    { s: unit, colour: "#F0407A" },
    { s: unit * 1.618, colour: "#FF7A1A" },
    { s: unit * 1.618 * 1.618, colour: "#FFC526" },
  ];
  // The step between centres, which is what puts them on one diagonal.
  const step = unit * 1.75;

  return (
    <div
      style={{
        width: "100%", height: "100%", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "#15133A", borderRadius: radius, position: "relative",
      }}
    >
      {squares.map((sq, i) => (
        <div
          key={sq.colour}
          style={{
            position: "absolute",
            width: sq.s, height: sq.s,
            borderRadius: sq.s * 0.16,
            background: sq.colour,
            transform: `rotate(45deg)`,
            // Bottom left to top right, the direction the mark walks in.
            left: size / 2 + (i - 1) * step - sq.s / 2,
            top: size / 2 - (i - 1) * step - sq.s / 2,
          }}
        />
      ))}
    </div>
  );
}
