"""Puts the QR code for the review link into an HTML file (as vector paths, between the qr markers).

Usage: python3 maak-qr.py [url] [html-file]
  url:       default https://www.rkmbarbershop.nl/review
  html-file: default card.html next to this script (the review card); the counter sign uses
             ../../kassabordje/bron/bordje.html
Needs: pip install segno
"""
import re
import sys
from pathlib import Path

import segno

URL = sys.argv[1] if len(sys.argv) > 1 else "https://www.rkmbarbershop.nl/review"
QUIET = 4  # modules of white around the code, as the QR standard requires

qr = segno.make(URL, error="m", micro=False, boost_error=False)
rows = list(qr.matrix)
n = len(rows)
size = n + 2 * QUIET

# One rectangle per horizontal run of dark modules keeps the path short.
parts = []
for y, row in enumerate(rows):
    x = 0
    while x < n:
        if row[x]:
            start = x
            while x < n and row[x]:
                x += 1
            parts.append(f"M{start + QUIET} {y + QUIET}h{x - start}v1h-{x - start}z")
        else:
            x += 1
svg = (
    f'<svg class="qr-code" viewBox="0 0 {size} {size}" shape-rendering="crispEdges" role="img" aria-label="QR-code: {URL}">'
    f'<path d="{"".join(parts)}" fill="#0d0a05"/></svg>'
)

card = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).with_name("card.html")
html = card.read_text()
html, count = re.subn(r"(<!-- qr:start -->).*?(<!-- qr:end -->)", lambda m: m.group(1) + svg + m.group(2), html, flags=re.S)
if not count:
    sys.exit(f"Geen <!-- qr:start --> … <!-- qr:end --> gevonden in {card}")
card.write_text(html)
print(f"QR-code versie {qr.version}-{qr.error} ({n}×{n} modules) voor {URL}: {count}× in {card.name} gezet")
