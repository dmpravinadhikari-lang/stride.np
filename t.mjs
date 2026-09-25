import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage(); p.setDefaultNavigationTimeout(180000);
await p.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
await p.type('input[type=email]', "bimala@everestglobal.com.np"); await p.type('input[type=password]', "stride1234");
await Promise.all([p.waitForNavigation({ waitUntil: "networkidle2" }), p.click('button[type=submit]')]);
console.log("front desk home:", (await p.evaluate(() => document.querySelector("main").innerText.replace(/\n+/g," | "))).slice(0,400));
await p.screenshot({ path: process.argv[2] + "/home-front-desk.png" });
await b.close();
