import { ImageResponse } from "next/og";
import { officeYakMark } from "@/lib/brand-mark";

/**
 * Android will not offer "Add to home screen" without a 192px icon, and Nepal
 * is a ~89% mobile market. So this is the icon that decides whether OfficeYak
 * can be installed at all. Served as a route rather than a checked-in PNG so
 * the mark is generated from one definition and cannot drift.
 */
export function GET() {
  return new ImageResponse(officeYakMark(192), { width: 192, height: 192 });
}
