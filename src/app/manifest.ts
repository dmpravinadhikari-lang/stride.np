import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

/**
 * Installable web app.
 *
 * Nearly nine in ten broadband connections in Nepal are mobile, and Android
 * dominates. An installable PWA gives a student an icon on their home screen,
 * a full-screen shell and a cached offline page, without an app store, a
 * download over metered data, or a second codebase. The native app comes later
 * and reads the same API; this is the version that works this week.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name}, ${BRAND.tagline}`,
    short_name: BRAND.name,
    description:
      "Plan your study abroad from Nepal: true cost in rupees, eligibility, loan EMI, universities, scholarships, a dated timeline, and AI practice for the test and interview.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7FDFE",
    theme_color: "#001619",
    lang: "en-NP",
    categories: ["education", "productivity"],
    // Android needs a 192 to offer installation at all and a 512 for the splash
    // screen. The maskable entry is a separate, padded drawing, tagging an
    // edge-to-edge icon as maskable just gets its corners cropped off.
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png", purpose: "any" },
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "Cost calculator", short_name: "Cost", url: "/tools/cost" },
      { name: "Eligibility check", short_name: "Eligibility", url: "/tools/eligibility" },
      { name: "My plan", short_name: "Plan", url: "/app/checklist" },
    ],
  };
}
