import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/brand";
import { ServiceWorker } from "@/components/ServiceWorker";
import type { Viewport } from "next";

const archivo = Archivo({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-archivo" });
// Poppins is the face Nepali consumer products are set in — Khalti and eSewa
// both use it — so the interface reads as local rather than imported.
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex" });

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description:
    "Plan your study abroad from Nepal properly: true cost in NPR, eligibility, education loan EMI, universities, scholarships and a dated application timeline for Australia, New Zealand, the UK, Ireland, the USA and Canada. Free to start, plus AI IELTS practice, mock interviews and SOP coaching.",
  metadataBase: new URL(`https://${BRAND.domain}`),
  openGraph: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
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
  themeColor: "#001619",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${poppins.variable} ${mono.variable}`}>
      <body>
        {/* Scroll-revealed sections start at opacity 0 and are switched on by
            an observer. If scripting never runs — a failed bundle, a data-saver
            proxy stripping JS, a crawler that does not execute it — that would
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
