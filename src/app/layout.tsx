import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/brand";
import { ServiceWorker } from "@/components/ServiceWorker";
import type { Viewport } from "next";

// One face for the whole interface. Plus Jakarta Sans holds its shapes at the
// 13px a dense CRM is mostly made of, where Poppins, a geometric consumer
// face, closes up. Figures are set in a monospace so columns of numbers line
// up down the page.
/*
 * Outfit for everything, JetBrains Mono for anything that lines up.
 *
 * The brand guidelines set both, and the second one earns its place: an ID, a
 * band score, a rupee figure and a timestamp all read wrong in a proportional
 * face, because the columns stop being columns.
 */
const display = Outfit({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display-ui" });
const sans = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans-ui" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono-ui" });

export const metadata: Metadata = {
  title: `${BRAND.name}, ${BRAND.tagline}`,
  description:
    "Plan your study abroad from Nepal properly: true cost in NPR, eligibility, education loan EMI, universities, scholarships and a dated application timeline for Australia, New Zealand, the UK, Ireland, the USA and Canada. Free to start, plus AI IELTS practice, mock interviews and SOP coaching.",
  metadataBase: new URL(`https://${BRAND.domain}`),
  openGraph: {
    // No title here on purpose: Next fills og:title from each page's own
    // title when this is absent. Setting it once meant every page shared as
    // "OfficeYak, Carries the whole office", whatever the page was about.
    description:
      "Plan it now, not three weeks before the deadline. Free tools for Nepali students: true cost in NPR, eligibility, loan EMI, universities, scholarships and a dated application timeline.",
    locale: "en_NP",
    type: "website",
  },
};

/**
 * viewport-fit=cover lets the bottom tab bar sit above the home indicator on a
 * notched phone, which is what the safe-area padding in MobileNav pairs with.
 */
export const viewport: Viewport = {
  themeColor: "#1A73E8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        {/* Scroll-revealed sections start at opacity 0 and are switched on by
            an observer. If scripting never runs, a failed bundle, a data-saver
            proxy stripping JS, a crawler that does not execute it. That would
            leave whole sections permanently invisible. This restores them. */}
        <noscript>
          <style>{`.reveal { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
