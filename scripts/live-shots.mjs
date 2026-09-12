/**
 * Screenshots of the live Happy Panda website for the reel.
 *
 *   node scripts/live-shots.mjs video/public/happypanda/live
 *
 * The live site, not the STRIDE app in this repo — they are different products
 * with different features, and the reel must only ever show the former.
 *
 * Needs puppeteer-core (a dependency of this repo) and a Chrome. Set the path
 * at CHROME below if yours is elsewhere.
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
const OUT = process.argv[2];
const BASE = "https://www.happypandaeducation.com";
const SHOTS = [
  { slug: "home", path: "/", y: 0 },
  { slug: "destinations", path: "/destinations", y: 430 },
  { slug: "australia", path: "/destinations/australia", y: 180 },
  { slug: "cv-maker", path: "/tools/cv-maker", y: 0 },
  { slug: "loan", path: "/tools/loan-calculator", y: 860 },
  { slug: "process", path: "/process", y: 420 },
  { slug: "fees", path: "/fees", y: 400 },
  { slug: "tools", path: "/tools", y: 0 },
  { slug: "success", path: "/success-stories", y: 300 },
];
mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: process.env.SHOTS_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars",
         // Only needed behind an inspecting proxy; harmless otherwise.
         ...(process.env.HTTPS_PROXY ? [`--proxy-server=${process.env.HTTPS_PROXY}`] : []),
         "--ssl-version-max=tls1.2", "--disable-quic"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

let sampled = false;
for (const s of SHOTS) {
  try {
    await page.goto(BASE + s.path, { waitUntil: "networkidle2", timeout: 90000 });
    await page.evaluate(() => new Promise((r) => setTimeout(r, 1600)));
    if (!sampled) {
      const colours = await page.evaluate(() => {
        const seen = {};
        for (const el of Array.from(document.querySelectorAll("a,button,div,section,span,h1,h2"))) {
          const cs = getComputedStyle(el);
          for (const v of [cs.backgroundColor, cs.color]) {
            if (!v || v === "rgba(0, 0, 0, 0)") continue;
            seen[v] = (seen[v] || 0) + 1;
          }
        }
        return Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, 14);
      });
      console.log("COLOURS:", JSON.stringify(colours));
      sampled = true;
    }
    // The site's header is sticky and translucent. Left as it is, anything it
    // passes over ghosts through it and a still reads as a smudge rather than
    // as a page. Solid white for the capture, same header otherwise.
    await page.evaluate(() => {
      for (const el of Array.from(document.querySelectorAll("header, nav, div"))) {
        const cs = getComputedStyle(el);
        if (cs.position === "sticky" || cs.position === "fixed") {
          el.style.backdropFilter = "none";
          el.style.webkitBackdropFilter = "none";
          if (cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)") {
            el.style.backgroundColor = "#ffffff";
          }
        }
      }
    });
    await page.evaluate((v) => window.scrollTo(0, v), s.y);
    await page.evaluate(() => new Promise((r) => setTimeout(r, 900)));
    await page.screenshot({ path: `${OUT}/${s.slug}.png` });
    console.log("ok", s.slug);
  } catch (e) { console.log("FAILED", s.slug, e.message.slice(0, 70)); }
}
await browser.close();
