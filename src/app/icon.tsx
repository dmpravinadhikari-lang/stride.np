import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** The wordmark's initial on the brand ground, with the cyan full stop. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#001619", color: "#fff", fontSize: 40, fontWeight: 700, letterSpacing: "-0.05em",
        borderRadius: 14, position: "relative",
      }}>
        S
        <div style={{
          position: "absolute", right: 11, bottom: 15, width: 8, height: 8,
          borderRadius: 999, background: "#50E8F4", display: "flex",
        }} />
      </div>
    ),
    { ...size },
  );
}
