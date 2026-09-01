import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#1B3468", color: "#fff", fontSize: 112, fontWeight: 700, letterSpacing: "-0.05em",
        position: "relative",
      }}>
        S
        <div style={{
          position: "absolute", right: 32, bottom: 44, width: 22, height: 22,
          borderRadius: 999, background: "#F4222E", display: "flex",
        }} />
      </div>
    ),
    { ...size },
  );
}
