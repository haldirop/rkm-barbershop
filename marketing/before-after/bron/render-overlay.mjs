// Before/after video: captures the animated text layer (overlay.html) as transparent 1080x1920 PNGs, one folder per scene:
// <out>/s<scene>/<frame>.png. Each scene is rendered a little past its cuts, for the transitions.
// Usage: node render-overlay.mjs <out-dir>
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const out = process.argv[2] ?? "ov";
const FPS = 30, LENGTH = 12.5;
const CUTS = [0, 3, 5, 7, 9, LENGTH]; // scene s runs from CUTS[s] to CUTS[s + 1]
const PAD = 0.45;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

const jobs = [];
for (let s = 0; s < CUTS.length - 1; s++) {
  mkdirSync(`${out}/s${s}`, { recursive: true });
  const first = Math.max(0, Math.floor((CUTS[s] - PAD) * FPS));
  const last = Math.min(Math.round(LENGTH * FPS) - 1, Math.ceil((CUTS[s + 1] + PAD) * FPS));
  for (let i = first; i <= last; i++) jobs.push([s, i]);
}

async function worker(list) {
  const page = await (await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })).newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await page.goto(`file://${process.cwd()}/overlay.html`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
  for (const [s, i] of list) {
    await page.evaluate(([t, s]) => window.render(t, s), [i / FPS, s]);
    await page.screenshot({ path: `${out}/s${s}/${String(i).padStart(4, "0")}.png`, omitBackground: true });
  }
}
const N = 4;
const t0 = Date.now();
await Promise.all(Array.from({ length: N }, (_, k) => worker(jobs.filter((_, j) => j % N === k))));
console.log(`${jobs.length} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await browser.close();
