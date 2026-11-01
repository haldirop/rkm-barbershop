"""
Makes the website logo (crown + RKM in satin gold) from the owner's example picture,
voorbeeld.webp: the silver logo on a dark wall is cut out and recoloured to the site's gold.

Writes:
  src/assets/rkm-mark.png          logo with a transparent background (2x, for sharp screens)
  public/brand/rkm-logo-email.png  the same on black, for the e-mails

Run from the project folder (Python 3 with numpy and Pillow):
  python3 drukwerk/logo/maak-logo.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
src = Image.open(Path(__file__).with_name("voorbeeld.webp")).convert("RGB")
box = (282, 214, 1082, 646)  # crown + RKM, with a small margin
im = np.asarray(src.crop(box)).astype(np.float32) / 255

lum = im @ np.array([0.2126, 0.7152, 0.0722], np.float32)
# The wall around the logo: estimate it per pixel from a blurred, letter-free version.
wall_est = Image.fromarray((np.where(lum < 0.16, lum, 0.11) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(25))
wall = np.asarray(wall_est, np.float32) / 255
lift = lum - wall

lo, hi = 0.05, 0.2  # how much brighter than the wall counts as metal
alpha = np.clip((lift - lo) / (hi - lo), 0, 1)
alpha = alpha * alpha * (3 - 2 * alpha)  # smooth edge

# Remove specks: drop tiny isolated bits of wall noise.
a_img = Image.fromarray((alpha * 255).astype(np.uint8))
a_img = a_img.filter(ImageFilter.MedianFilter(3))
alpha = np.asarray(a_img, np.float32) / 255
# Keep only what touches the letters: faint light on the wall (e.g. above the crown) goes.
# Only a 1-2 px soft edge around the solid metal survives.
# The metal itself is clearly brighter than any light on the wall.
solid = Image.fromarray(((lift > 0.2) * 255).astype(np.uint8))
# Darker brushing inside a letter can dip below that: fill gaps that are enclosed by metal.
# Real openings (inside the R, between crown and band) are connected to the outside or large.
pad = Image.new("L", (solid.width + 2, solid.height + 2), 0)
pad.paste(solid, (1, 1))
ImageDraw.floodfill(pad, (0, 0), 128)
lab = np.asarray(pad)[1:-1, 1:-1]
enclosed = lab == 0
filled = np.asarray(solid) > 0
seen = np.zeros(enclosed.shape, bool)
for y, x in zip(*np.nonzero(enclosed)):
    if seen[y, x]:
        continue
    comp = Image.fromarray(np.where(enclosed, 0, 255).astype(np.uint8))
    ImageDraw.floodfill(comp, (int(x), int(y)), 77)
    region = np.asarray(comp) == 77
    seen |= region
    if region.sum() < 1500:
        filled |= region
solid = Image.fromarray((filled * 255).astype(np.uint8))
# Close thin darker stripes inside the metal first, then allow a soft edge of 1-2 px.
core = solid.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
core = core.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(0.7))
alpha = alpha * (np.asarray(core, np.float32) / 255)
alpha = np.maximum(alpha, filled.astype(np.float32))

# Satin gold: map the metal's brightness onto a gold ramp, keeping its brushing and bevels.
l = np.clip((lum - 0.06) / 0.82, 0, 1)
stops = np.array([0.0, 0.18, 0.4, 0.62, 0.8, 0.92, 1.0], np.float32)
# The site's gold: gold-deep #a8722f, gold #dba85c, gold-bright #f6cf87, gold-light #ffeac2.
hexes = ["#160d04", "#4a300f", "#8f6326", "#c49048", "#dba85c", "#f0c983", "#ffeac2"]
cols = np.array([[int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)] for h in hexes], np.float32)
rgb = np.stack([np.interp(l, stops, cols[:, c]) for c in range(3)], axis=-1)

out = np.dstack([rgb, alpha])
img = Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA")
img = img.crop(img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())

# 2x with Lanczos on premultiplied colour, so the edges get no dark or light fringe.
r, g, b, a = img.split()
pm = Image.merge("RGB", [Image.composite(c, Image.new("L", img.size, 0), a) for c in (r, g, b)])
size = (img.width * 2, img.height * 2)
pm2 = pm.resize(size, Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
a2 = a.resize(size, Image.LANCZOS)
P = np.asarray(pm2, np.float32)
A = np.asarray(a2, np.float32)[..., None] / 255
C = np.where(A > 0.004, np.clip(P / np.maximum(A, 0.004), 0, 255), 0)
mark = Image.fromarray(np.dstack([C, A[..., 0] * 255]).astype(np.uint8), "RGBA")
mark.save(ROOT / "src/assets/rkm-mark.png", optimize=True)

# E-mail: 360 px wide on the e-mail background (#0b0b0c), shown at 180 px.
w = 360
h = round(w * mark.height / mark.width)
email = Image.new("RGBA", (w, h), (11, 11, 12, 255))
email.alpha_composite(mark.resize((w, h), Image.LANCZOS))
email.convert("RGB").save(ROOT / "public/brand/rkm-logo-email.png", optimize=True)
print(f"logo {mark.size[0]}x{mark.size[1]}, e-maillogo {w}x{h}")
