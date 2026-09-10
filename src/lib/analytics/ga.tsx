import Script from "next/script";

/**
 * Google Analytics 4.
 *
 * Loaded only when a measurement ID is configured, and deliberately NOT on
 * parent progress pages or anywhere under /app, a parent opening a link about
 * their child's visa application has not agreed to be measured, and signed-in
 * behaviour is our own business, not Google's. Marketing pages only.
 */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || "";
export const gaConfigured = () => GA_ID.length > 0;

export function GoogleAnalytics() {
  if (!GA_ID) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('config','${GA_ID}',{anonymize_ip:true});`}
      </Script>
    </>
  );
}
