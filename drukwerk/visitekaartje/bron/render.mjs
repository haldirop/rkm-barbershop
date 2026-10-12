// Renders the business card: background at 600 dpi, then PDF (vector text) and 600 dpi PNGs.
import { chromium } from "playwright";
const dir = process.cwd();
const what = process.argv[2] ?? "all"; // bg | final | guides | all
const DPI = 600, SCALE = DPI / 96;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function open(mode) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 520 }, deviceScaleFactor: SCALE });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  page.on("console", (m) => m.type() === "error" && console.log("CONSOLE", m.text()));
  await page.goto(`file://${dir}/card.html`);
  await page.evaluate((mode) => { document.documentElement.className = mode; }, mode);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
  return { ctx, page };
}

// One side at the top left of a viewport just larger than the card, then cut to exactly
// 91 x 61 mm at 600 dpi (2150 x 1441 px).
async function shot(page, side, path, transparent = false) {
  await page.evaluate((side) => {
    for (const c of document.querySelectorAll(".card")) c.style.display = c.id === side ? "" : "none";
  }, side);
  await page.setViewportSize({ width: 344, height: 231 });
  await page.screenshot({ path: "tmp-shot.png", omitBackground: transparent });
  await page.evaluate(() => { for (const c of document.querySelectorAll(".card")) c.style.display = ""; });
  const { execFileSync } = await import("node:child_process");
  execFileSync("python3", ["-c", `from PIL import Image; im = Image.open("tmp-shot.png").convert("${transparent ? "RGBA" : "RGB"}"); im.crop((0, 0, 2150, 1441)).save("${path}", dpi=(600, 600))`]);
}

if (what === "bg" || what === "all") {
  const { ctx, page } = await open("mode-bg");
  for (const side of ["front", "back"]) await shot(page, side, `bg-${side}.png`);
  console.log("backgrounds");
  await ctx.close();
}
if (what === "fx" || what === "bg" || what === "all") {
  const { ctx, page } = await open("mode-fx");
  for (const side of ["front", "back"]) await shot(page, side, `fx-${side}.png`, true);
  console.log("glints");
  await ctx.close();
}
if (what === "final" || what === "all") {
  const { ctx, page } = await open("mode-final");
  for (const side of ["front", "back"]) await shot(page, side, `out-${side}.png`);
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: "out.pdf", width: "91mm", height: "61mm", printBackground: true, preferCSSPageSize: true });
  console.log("final pdf + png");
  await ctx.close();
}
if (what === "guides" || what === "all") {
  const { ctx, page } = await open("mode-final mode-guides");
  for (const side of ["front", "back"]) await shot(page, side, `guides-${side}.png`);
  console.log("guides");
  await ctx.close();
}
await browser.close();
