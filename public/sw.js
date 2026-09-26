/*
 * A deliberately small service worker.
 *
 * WHAT IT CACHES: the offline page and Next's immutable build assets. That is
 * all. It never caches a page under /app or /p, and never anything from /api —
 * those carry one person's data, and a cached copy on a shared phone is a
 * privacy problem, not a performance win.
 *
 * WHY IT EXISTS: mobile data in Nepal drops out. A student mid-way through a
 * checklist should see a page that explains itself rather than the browser's
 * dinosaur.
 */
const VERSION = "officeyak-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll([OFFLINE_URL])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isPrivate = (url) =>
  url.pathname.startsWith("/app") ||
  url.pathname.startsWith("/api") ||
  url.pathname.startsWith("/p/") ||
  url.pathname.startsWith("/login") ||
  url.pathname.startsWith("/signup");

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isPrivate(url)) return;                       // never touched by the cache

  // Build assets are content-hashed, so cache-first is safe and fast.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((hit) =>
        hit || fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(request, copy));
          return res;
        })),
    );
    return;
  }

  // Pages: always try the network so content is current; fall back when it is not.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((hit) => hit || Response.error())),
    );
  }
});
