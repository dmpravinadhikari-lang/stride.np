import { ImageResponse } from "next/og";
import { officeYakMark } from "@/lib/brand-mark";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** The bell on a Navy tile, which is the app icon the brand book specifies. */
export default function Icon() {
  return new ImageResponse(officeYakMark(64), { ...size });
}
