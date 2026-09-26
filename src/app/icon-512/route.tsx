import { ImageResponse } from "next/og";
import { officeYakMark } from "@/lib/brand-mark";

/** The splash-screen icon Android uses while a launched PWA boots. */
export function GET() {
  return new ImageResponse(officeYakMark(512), { width: 512, height: 512 });
}
