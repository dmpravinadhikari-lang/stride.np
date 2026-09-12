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

for (let a = 0; a < 4; a++) {
  await page.goto(BASE + "/cost-calculator", { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  for (let i = 0; i < 12 && page.url().includes("sgcaptcha"); i++) await new Promise((r) => setTimeout(r, 2500));
  await new Promise((r) => setTimeout(r, 2500));
  if ((await page.evaluate(() => document.documentElement.scrollHeight)) > 1200) break;
}

// Every evaluate is guarded: the captcha can bounce the page at any moment
// and a destroyed context must not take the whole run down with it.
const safe = async (fn, fallback = null) => {
  for (let i = 0; i < 3; i++) {
    try { return await fn(); } catch { await new Promise((r) => setTimeout(r, 1500)); }
  }
  return fallback;
};

const step = async () => safe(() => page.evaluate(() => {
  const el = document.body.innerText.match(/STEP (\d) OF 6/);
  return el ? +el[1] : null;
}));

const press = async (re) => safe(() => page.evaluate((src) => {
  const rx = new RegExp(src, "i");
  const b = Array.from(document.querySelectorAll("button")).find((x) => rx.test(x.innerText) && !x.disabled);
  if (!b) return null;
  const t = b.innerText.trim().slice(0, 28);
  b.click();
  return t;
}, re.source));

const choose = async () => safe(() => page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll("div,label,button"))
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 220 && r.height > 80 && r.height < 240; });
  if (cards.length) { cards[0].click(); return true; }
  return false;
}));

for (let i = 0; i < 14; i++) {
  const s = await step();
  if (s === 6) {
    const hit = await press(/calculate/);
    console.log("step 6 -> pressed", hit);
    break;
  }
  await choose().catch(() => {});
  await new Promise((r) => setTimeout(r, 400));
  const n = await press(/continue|next/);
  if (!n) { console.log("no continue at step", s); break; }
  await new Promise((r) => setTimeout(r, 1500));
}

await new Promise((r) => setTimeout(r, 3500));
const h = await safe(() => page.evaluate(() => document.documentElement.scrollHeight), 0);
console.log("height after calculate", h);
const text = await safe(() => page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, "\n").slice(0, 700)), "(unreadable)");
console.log("---\n" + text);
for (const y of [0, 400, 900, 1400, 1900]) {
  await safe(() => page.evaluate((v) => window.scrollTo(0, v), y));
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: `${OUT}/total-${y}.png` }).catch(() => {});
}
await browser.close();
