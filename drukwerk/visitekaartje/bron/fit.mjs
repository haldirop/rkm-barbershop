// Checks that no text line overflows its box and that all text stays 4 mm inside the cut edge.
import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const p = await (await b.newContext({ viewport: { width: 400, height: 520 } })).newPage();
await p.goto(`file://${process.cwd()}/card.html`);
await p.evaluate(() => document.fonts.ready);
const issues = await p.evaluate(() => {
  const out = [];
  for (const card of document.querySelectorAll(".card")) {
    const c = card.getBoundingClientRect(), mm = 3.7795;
    const walker = document.createTreeWalker(card.querySelector(".content"), NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const t = walker.currentNode; if (!t.textContent.trim()) continue;
      const r = document.createRange(); r.selectNodeContents(t);
      for (const box of r.getClientRects()) {
        const left = (box.left - c.left) / mm - 3, right = (box.right - c.left) / mm - 3;
        const top = (box.top - c.top) / mm - 3, bottom = (box.bottom - c.top) / mm - 3;
        if (left < 4 || right > 81 || top < 4 || bottom > 51) out.push(`${card.id}: "${t.textContent.trim()}" ${left.toFixed(1)}-${right.toFixed(1)} x ${top.toFixed(1)}-${bottom.toFixed(1)}`);
      }
    }
    for (const el of card.querySelectorAll(".content *")) {
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible") out.push(`${card.id}: overflow ${el.className}`);
    }
  }
  return out;
});
console.log(issues.length ? issues.join("\n") : "alle tekst binnen de veilige zone (4 mm van de snijrand)");
await b.close();
