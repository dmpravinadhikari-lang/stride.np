import type { NextConfig } from "next";

const config: NextConfig = {
  // The dev-mode badge sits on top of the sidebar footer; off so demos are clean.
  devIndicators: false,
  // node:sqlite is a built-in module; keep it out of the bundler's way.
  serverExternalPackages: [],
  experimental: {
    // Server Actions are how every form in STRIDE talks to the server.
    serverActions: {
      bodySizeLimit: "12mb", // 8MB document + encoding overhead
      // Next checks the Origin header on Server Actions; naming the real hosts
      // makes that explicit rather than relying on the inferred default.
      allowedOrigins: [
        "localhost:3000",
        ...(process.env.STRIDE_ROOT_DOMAIN ? [process.env.STRIDE_ROOT_DOMAIN] : []),
      ],
    },
  },
};

/**
 * Security headers.
 *
 * The CSP is deliberately tight: no plugins, no framing, and scripts limited to
 * this site plus Google's tag and sign-in. 'unsafe-inline' is present for
 * scripts because Next injects inline bootstrap and GA needs an inline config —
 * removing it means adding nonces, which is worth doing later but is not the
 * thing standing between STRIDE and a breach today.
 */
const isDev = process.env.NODE_ENV !== "production";

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  // Next's dev server compiles with eval for hot reload. Without this the whole
  // client bundle is blocked and nothing interactive works while developing —
  // and 'unsafe-eval' must never reach production, so it is switched by build.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://accounts.google.com`,
  `connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com${isDev ? " ws: http://localhost:*" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://www.googletagmanager.com",
  "upgrade-insecure-requests",
].join("; ");

config.headers = async () => [
  {
    source: "/:path*",
    headers: [
      { key: "Content-Security-Policy", value: CSP },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=()" },
      // Only meaningful over HTTPS, which is what Caddy will serve on Contabo.
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    ],
  },
  {
    // A student's file and a parent's progress page must never be cached by a
    // proxy, or left in a shared browser for the next person.
    source: "/(app|p)/:path*",
    headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
  },
];

export default config;
