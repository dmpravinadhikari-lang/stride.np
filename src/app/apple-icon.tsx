import { ImageResponse } from "next/og";
import { officeYakMark } from "@/lib/brand-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * The home screen icon on an iPhone. iOS rounds the corners itself, so this
 * draws the Navy tile square and lets the system do it.
 */
export default function AppleIcon() {
  return new ImageResponse(officeYakMark(180, { maskable: true }), { ...size });
}
