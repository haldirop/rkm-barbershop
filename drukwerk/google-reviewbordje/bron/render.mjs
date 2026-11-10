// Renders the Google review sign: background and glints at 424 dpi (= 300 dpi on the A4 version),
// then the PDFs (text, QR code and cut marks as vector) and PNG previews.
//   node render.mjs [bg|final|guides|all]
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
const dir = process.cwd();
const what = process.argv[2] ?? "all";
const MM = 96 / 25.4;
const BG_DPI = 300 * Math.SQRT2; // the A4 version is the A5 design enlarged by √2
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

const LAYOUTS = {
  capture: { w: 154, h: 216 },
  a5: { w: 210, h: 297 }, // A4 sheet with the A5 sign and cut marks
  a4: { w: 216, h: 303 }, // A4 + 3 mm bleed
};

async function open(layout, mode, dpi) {
  const { w, h } = LAYOUTS[layout];
  const ctx = await browser.newContext({
    viewport: { width: Math.ceil(w * MM), height: Math.ceil(h * MM) },
    deviceScaleFactor: dpi / 96,
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  page.on("console", (m) => m.type() === "error" && !/ERR_FILE_NOT_FOUND/.test(m.text()) && console.log("CONSOLE", m.text()));
  await page.goto(`file://${dir}/bordje.html`);
  await page.evaluate(({ cls, w, h }) => {
    document.documentElement.className = cls;
    const style = document.createElement("style");
    style.textContent = `@page { size: ${w}mm ${h}mm; margin: 0; }`;
    document.head.appendChild(style);
  }, { cls: `layout-${layout} ${mode}`, w, h });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
  return { ctx, page, w, h };
}

async function shot(page, w, h, dpi, path, { transparent = false, jpeg = false } = {}) {
  await page.screenshot({ path: "tmp-shot.png", omitBackground: transparent });
  const px = (mm) => Math.round((mm / 25.4) * dpi);
  const save = jpeg
    ? `save("${path}", quality=92, subsampling=0, dpi=(${Math.round(dpi)}, ${Math.round(dpi)}))`
    : `save("${path}", dpi=(${Math.round(dpi)}, ${Math.round(dpi)}))`;
  execFileSync(process.env.PYTHON || "python3", ["-c",
    `from PIL import Image; im = Image.open("tmp-shot.png").convert("${transparent ? "RGBA" : "RGB"}"); im.crop((0, 0, ${px(w)}, ${px(h)})).${save}`]);
}

if (what === "bg" || what === "all") {
  const bg = await open("capture", "mode-bg", BG_DPI);
  await shot(bg.page, bg.w, bg.h, BG_DPI, "bg.jpg", { jpeg: true });
  await bg.ctx.close();
  const fx = await open("capture", "mode-fx", BG_DPI);
  await shot(fx.page, fx.w, fx.h, BG_DPI, "fx.png", { transparent: true });
  await fx.ctx.close();
  console.log("achtergrond en glinsteringen");
}
if (what === "final" || what === "all") {
  for (const layout of ["a5", "a4"]) {
    const { ctx, page, w, h } = await open(layout, "mode-final", 300);
    await shot(page, w, h, 300, `out-${layout}.png`);
    await page.emulateMedia({ media: "print" });
    await page.pdf({ path: `out-${layout}.pdf`, width: `${w}mm`, height: `${h}mm`, printBackground: true, preferCSSPageSize: true });
    await ctx.close();
    console.log(`out-${layout}.pdf + png`);
  }
}
if (what === "guides" || what === "all") {
  const { ctx, page, w, h } = await open("capture", "mode-final mode-guides", 200);
  await shot(page, w, h, 200, "guides.png");
  await ctx.close();
  console.log("hulplijnen");
}
execFileSync("rm", ["-f", "tmp-shot.png"]);
await browser.close();
