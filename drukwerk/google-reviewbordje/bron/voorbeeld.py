"""Preview of the cut sign on a light background, made from the A4 render (out-a4.png).

Usage: python3 voorbeeld.py  (after node render.mjs)  -> voorbeeld.png
Needs: Pillow
"""
from PIL import Image, ImageFilter

src = Image.open("out-a4.png").convert("RGB")
bleed = round(3 / 25.4 * 300)  # 3 mm at 300 dpi
sign = src.crop((bleed, bleed, src.width - bleed, src.height - bleed))
W, pad = 1000, 110
sign = sign.resize((W, round(sign.height * W / sign.width)), Image.LANCZOS)
canvas = Image.new("RGB", (W + 2 * pad, sign.height + 2 * pad), (236, 235, 231))
shadow = Image.new("L", canvas.size, 0)
shadow.paste(150, (pad + 6, pad + 18, pad + 6 + W, pad + 18 + sign.height))
canvas.paste(Image.new("RGB", canvas.size, (90, 85, 75)), (0, 0), shadow.filter(ImageFilter.GaussianBlur(26)))
canvas.paste(sign, (pad, pad))
canvas.save("voorbeeld.png", optimize=True)
print("voorbeeld.png", canvas.size)
