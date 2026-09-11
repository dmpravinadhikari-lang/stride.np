/**
 * Captures the screens used in the marketing videos, from the real app.
 *
 *   npm run build && npm run start        # in one terminal
 *   npm run shots                         # in another
 *
 * Shot at phone width, because the videos are vertical and a desktop capture
 * squeezed into a 9:16 frame reads as a screenshot of a website rather than as
 * the thing a student holds in their hand.
 *
 * The branch subdomain matters: happypanda.localhost is Happy Panda's address,
 * and it is what puts their name on the login screen. Add it to /etc/hosts
 * first if your machine does not already resolve *.localhost:
 *
 *   127.0.0.1 happypanda.localhost
 */
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.SHOTS_BASE ?? "http://happypanda.localhost:3000";
const OUT = process.env.SHOTS_OUT ?? "video/public/happypanda/shots";

/** Chrome to drive. Playwright's download, then the usual macOS location. */
const CHROME =
  process.env.SHOTS_CHROME ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** The student whose file the signed-in screens show. */
const STUDENT = { email: "sujata@example.com", password: "stride1234" };

type Shot = { slug: string; path: string; y: number; auth?: boolean };

const SHOTS: Shot[] = [
  // Public, no account needed.
  { slug: "home-1", path: "/", y: 0 },
  { slug: "home-2", path: "/", y: 780 },
  { slug: "home-3", path: "/", y: 1700 },
  { slug: "tools-1", path: "/tools", y: 0 },
  { slug: "tools-2", path: "/tools", y: 760 },
  { slug: "cost-1", path: "/tools/cost", y: 420 },
  { slug: "uni-1", path: "/tools/universities", y: 520 },
  { slug: "blog-1", path: "/blog", y: 260 },
  // The one page that carries the consultancy's own name.
  { slug: "login", path: "/login", y: 0 },
  // The student's file, signed in.
  { slug: "app-dashboard", path: "/app", y: 0, auth: true },
  { slug: "app-dashboard-2", path: "/app", y: 700, auth: true },
  { slug: "app-checklist", path: "/app/checklist", y: 220, auth: true },
  { slug: "app-documents", path: "/app/documents", y: 180, auth: true },
  { slug: "app-cost", path: "/app/cost", y: 200, auth: true },
  { slug: "app-sop", path: "/app/sop", y: 120, auth: true },
  { slug: "app-mock-tests", path: "/app/mock-tests", y: 140, auth: true },
  { slug: "app-universities", path: "/app/universities", y: 200, auth: true },
];

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"],
});

const page = await browser.newPage();
await page.setViewport({
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

let signedIn = false;
let current: string | null = null;

for (const shot of SHOTS) {
  if (shot.auth && !signedIn) {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
    await page.type('input[name="email"]', STUDENT.email);
    await page.type('input[name="password"]', STUDENT.password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0", timeout: 60_000 }),
      page.click('button[type="submit"]'),
    ]);
    signedIn = true;
    current = null;
  }

  if (shot.path !== current) {
    await page.goto(BASE + shot.path, { waitUntil: "networkidle0", timeout: 60_000 });
    current = shot.path;
  }

  await page.evaluate((y: number) => window.scrollTo(0, y), shot.y);
  // Let the scroll settle before the shutter, or the capture catches the page
  // mid-move and every shot is a few pixels off from the one beside it.
  await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));
  await page.screenshot({ path: `${OUT}/${shot.slug}.png` });
  console.log(`  ${shot.slug}`);
}

await browser.close();
console.log(`\n${SHOTS.length} screens written to ${OUT}`);
