/**
 * One definition of the app mark, rendered at whatever size an icon route
 * needs. Keeping it here rather than repeating the JSX in four route files
 * means the launcher icon, the splash icon and the favicon cannot drift apart.
 */
export function strideMark(size: number, { maskable = false }: { maskable?: boolean } = {}) {
  // A maskable icon may lose everything outside the middle 80%, so the mark is
  // drawn inside that circle and the navy runs to the edges to be cropped.
  // Too small and it reads as a dot on the home screen, so it fills the safe
  // zone rather than hiding in the middle of it.
  const scale = maskable ? 0.95 : 1;
  const radius = maskable ? 0 : size * 0.22;

  // The full stop hangs past the right edge of the letter, so centring the
  // letter leaves the pair looking pushed right. Nudge back by the overhang.
  const overhang = size * 0.11 * scale;

  return (
    <div
      style={{
        width: "100%", height: "100%", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "#1B3468", borderRadius: radius, position: "relative",
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: size * 0.62 * scale, fontWeight: 700,
          letterSpacing: "-0.05em", position: "relative", marginRight: overhang,
        }}
      >
        S
        <div
          style={{
            position: "absolute",
            right: -size * 0.11 * scale,
            bottom: size * 0.08 * scale,
            width: size * 0.13 * scale,
            height: size * 0.13 * scale,
            borderRadius: 999, background: "#F4222E", display: "flex",
          }}
        />
      </div>
    </div>
  );
}
