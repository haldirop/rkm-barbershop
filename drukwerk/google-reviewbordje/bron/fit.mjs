// Google review sign: checks that no text overflows and that all text, the logo and the QR card
// stay 6 mm inside the cut line.
import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const p = await (await b.newContext({ viewport: { width: 600, height: 840 } })).newPage();
await p.goto(`file://${process.cwd()}/bordje.html`);
await p.evaluate(() => { document.documentElement.className = "layout-capture mode-final"; });
await p.evaluate(() => document.fonts.ready);
const issues = await p.evaluate(() => {
  const out = [], mm = 96 / 25.4, SAFE = 6;
  const trim = document.querySelector(".trim");
  const c = trim.getBoundingClientRect();
  const check = (label, box) => {
    const left = (box.left - c.left) / mm, right = (box.right - c.left) / mm;
    const top = (box.top - c.top) / mm, bottom = (box.bottom - c.top) / mm;
    if (left < SAFE || right > 148 - SAFE || top < SAFE || bottom > 210 - SAFE)
      out.push(`"${label}" ${left.toFixed(1)}-${right.toFixed(1)} x ${top.toFixed(1)}-${bottom.toFixed(1)}`);
  };
  const walker = document.createTreeWalker(trim, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const t = walker.currentNode;
    if (!t.textContent.trim() || t.parentElement.closest(".guides")) continue;
    const r = document.createRange();
    r.selectNodeContents(t);
    for (const box of r.getClientRects()) check(t.textContent.trim(), box);
  }
  for (const el of trim.querySelectorAll(".card, .logo")) check(el.className, el.getBoundingClientRect());
  // Text inside the white card stays 3 mm from its edge.
  const card = document.querySelector(".card .tile").getBoundingClientRect();
  for (const el of document.querySelectorAll(".card .head, .card .caption, .card .stars, .card .qr")) {
    const box = el.tagName === "DIV" && !el.classList.contains("qr") ? (() => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); })() : el.getBoundingClientRect();
    if (box.left - card.left < 3 * mm || card.right - box.right < 3 * mm || box.top - card.top < 3 * mm || card.bottom - box.bottom < 3 * mm)
      out.push(`kaart: "${el.className}" te dicht bij de rand`);
  }
  for (const el of trim.querySelectorAll("*")) {
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible") out.push(`overflow ${el.className}`);
  }
  return out;
});
console.log(issues.length ? issues.join("\n") : "alles binnen de veilige zone (6 mm binnen de snijrand)");
await b.close();
