import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage(); p.setDefaultNavigationTimeout(180000);
const errs=[]; p.on("pageerror", e=>errs.push(String(e).slice(0,200)));
await p.setViewport({ width: 1440, height: 1100 });
await p.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
await p.type('input[type=email]', "sanjeev@everestglobal.com.np"); await p.type('input[type=password]', "stride1234");
await Promise.all([p.waitForNavigation({ waitUntil: "networkidle2" }), p.click('button[type=submit]')]);
for (const r of ["/app/security", "/app/access", "/app/payroll"]) {
  const res = await p.goto("http://localhost:3000" + r, { waitUntil: "networkidle2" });
  console.log(r, res.status());
}
await p.goto("http://localhost:3000/app/security", { waitUntil: "networkidle2" });
console.log("errors:", errs.length?errs:"none");
await p.screenshot({ path: process.argv[2] + "/security.png", fullPage: true });
await b.close();
