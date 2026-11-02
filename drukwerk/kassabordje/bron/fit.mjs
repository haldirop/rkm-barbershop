// Counter sign: checks that no text overflows and that all text stays 6 mm inside its panel
// (so nothing is cut off or lands on the fold).
import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const p = await (await b.newContext({ viewport: { width: 1123, height: 794 } })).newPage();
await p.goto(`file://${process.cwd()}/bordje.html`);
await p.evaluate(() => document.fonts.ready);
const issues = await p.evaluate(() => {
  const out = [], mm = 96 / 25.4, SAFE = 6;
  for (const panel of document.querySelectorAll(".panel")) {
    const c = panel.getBoundingClientRect();
    const check = (label, box) => {
      const left = (box.left - c.left) / mm, right = (box.right - c.left) / mm;
      const top = (box.top - c.top) / mm, bottom = (box.bottom - c.top) / mm;
      if (left < SAFE || right > 125 - SAFE || top < SAFE || bottom > 177 - SAFE)
        out.push(`${panel.id}: "${label}" ${left.toFixed(1)}-${right.toFixed(1)} x ${top.toFixed(1)}-${bottom.toFixed(1)}`);
    };
    const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const t = walker.currentNode;
      if (!t.textContent.trim()) continue;
      const r = document.createRange();
      r.selectNodeContents(t);
      for (const box of r.getClientRects()) check(t.textContent.trim(), box);
    }
    for (const el of panel.querySelectorAll(".qr, .logo, .pill")) check(el.className, el.getBoundingClientRect());
    for (const el of panel.querySelectorAll("*")) {
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible") out.push(`${panel.id}: overflow ${el.className}`);
    }
  }
  return out;
});
console.log(issues.length ? issues.join("\n") : "alles binnen de veilige zone (6 mm binnen de snijrand en de vouw)");
await b.close();
