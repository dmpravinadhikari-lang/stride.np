import { ImageResponse } from "next/og";
import { officeYakMark } from "@/lib/brand-mark";

/**
 * The maskable variant. Android crops a maskable icon to whatever shape the
 * launcher uses, a circle, a squircle, a teardrop, keeping only the middle
 * 80%. An icon drawn edge to edge loses its corners, so this one is drawn
 * inside the safe zone with the brand colour bled to the edges.
 */
export function GET() {
  return new ImageResponse(officeYakMark(512, { maskable: true }), { width: 512, height: 512 });
}
