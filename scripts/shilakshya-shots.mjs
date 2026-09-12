import puppeteer from "puppeteer-core";
const OUT = process.argv[2];
const BASE = "https://shilakshya.com.np";
const browser = await puppeteer.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars",
         `--proxy-server=${process.env.HTTPS_PROXY}`, "--ssl-version-max=tls1.2", "--disable-quic"],
});
const page = await browser.newPage();
await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const safe = async (fn, f = null) => { for (let i = 0; i < 3; i++) { try { return await fn(); } catch { await new Promise((r) => setTimeout(r, 1200)); } } return f; };

for (const [slug, path, ys] of [["home", "/", [0, 1400, 2600]], ["gallery", "/gallery", [400, 1100, 1800]]]) {
  for (let a = 0; a < 4; a++) {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
    for (let i = 0; i < 12 && page.url().includes("sgcaptcha"); i++) await new Promise((r) => setTimeout(r, 2500));
    await new Promise((r) => setTimeout(r, 2500));
    if ((await safe(() => page.evaluate(() => document.documentElement.scrollHeight), 0)) > 1200) break;
  }
  // Walk the page so every lazy image is asked for, then come back.
  await safe(() => page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 220));
    }
    window.scrollTo(0, 0);
  }));
  await new Promise((r) => setTimeout(r, 4000));
  // And wait for them to actually decode.
  await safe(() => page.evaluate(() => Promise.all(
    Array.from(document.images).filter((i) => !i.complete).map((i) => i.decode().catch(() => {})),
  )));
  await new Promise((r) => setTimeout(r, 1500));
  for (const y of ys) {
    await safe(() => page.evaluate((v) => window.scrollTo(0, v), y));
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: `${OUT}/${slug}2-${y}.png` }).catch(() => {});
  }
  console.log(slug, "done");
}
await browser.close();
