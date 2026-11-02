// Renders the counter sign: background and glints at 300 dpi, then the A4 PDF (text, QR code and
// cut marks as vector) and a 300 dpi PNG of the whole sheet.
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
const dir = process.cwd();
const what = process.argv[2] ?? "all"; // bg | final | guides | all
const DPI = 300, SCALE = DPI / 96;
const PX_W = 3508, PX_H = 2480; // A4 landscape at 300 dpi
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function open(mode) {
  // A viewport just larger than the sheet (297 x 210 mm = 1122.5 x 793.7 CSS px).
  const ctx = await browser.newContext({ viewport: { width: 1123, height: 794 }, deviceScaleFactor: SCALE });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  page.on("console", (m) => m.type() === "error" && !/ERR_FILE_NOT_FOUND/.test(m.text()) && console.log("CONSOLE", m.text()));
  await page.goto(`file://${dir}/bordje.html`);
  await page.evaluate((mode) => { document.documentElement.className = mode; }, mode);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
  return { ctx, page };
}

async function shot(page, path, { transparent = false, jpeg = false } = {}) {
  await page.screenshot({ path: "tmp-shot.png", omitBackground: transparent });
  const save = jpeg ? `save("${path}", quality=93, subsampling=0, dpi=(${DPI}, ${DPI}))` : `save("${path}", dpi=(${DPI}, ${DPI}))`;
  execFileSync("python3", ["-c", `from PIL import Image; im = Image.open("tmp-shot.png").convert("${transparent ? "RGBA" : "RGB"}"); im.crop((0, 0, ${PX_W}, ${PX_H})).${save}`]);
}

if (what === "bg" || what === "all") {
  const { ctx, page } = await open("mode-bg");
  await shot(page, "bg.jpg", { jpeg: true });
  console.log("achtergrond");
  await ctx.close();
  const fx = await open("mode-fx");
  await shot(fx.page, "fx.png", { transparent: true });
  console.log("glinsteringen");
  await fx.ctx.close();
}
if (what === "final" || what === "all") {
  const { ctx, page } = await open("mode-final");
  await shot(page, "out.png");
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: "out.pdf", width: "297mm", height: "210mm", printBackground: true, preferCSSPageSize: true });
  console.log("pdf + png");
  await ctx.close();
}
if (what === "guides" || what === "all") {
  const { ctx, page } = await open("mode-final mode-guides");
  await shot(page, "guides.png");
  console.log("hulplijnen");
  await ctx.close();
}
await browser.close();
