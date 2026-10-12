"""Black marble with gold crackle veins, for print: 91 x 61 mm (85 x 55 + 3 mm bleed) at 600 dpi."""
import sys

import numpy as np
from PIL import Image, ImageFilter

W, H = 2150, 1441  # 91 x 61 mm at 600 dpi


def fbm(rng, w, h, base, octaves=5, persistence=0.55):
    """Fractal value noise: random grids upscaled with bicubic interpolation."""
    out = np.zeros((h, w), np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        gw, gh = max(2, int(w / base * 2**o)), max(2, int(h / base * 2**o))
        grid = rng.random((gh, gw)).astype(np.float32)
        img = Image.fromarray((grid * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        out += amp * (np.asarray(img, np.float32) / 255)
        total += amp
        amp *= persistence
    return out / total


def worley_edges(rng, xs, ys, cell):
    """Distance to the nearest cell border (F2 - F1) for jittered grid points."""
    gx, gy = xs / cell, ys / cell
    gx = gx - np.floor(gx.min()) + 2  # keep every neighbour index inside the grid
    gy = gy - np.floor(gy.min()) + 2
    ix, iy = np.floor(gx).astype(np.int32), np.floor(gy).astype(np.int32)
    jitter = rng.random((int(gy.max()) + 3, int(gx.max()) + 3, 2)).astype(np.float32)
    f1 = np.full(xs.shape, 1e9, np.float32)
    f2 = np.full(xs.shape, 1e9, np.float32)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            cx, cy = ix + dx, iy + dy
            j = jitter[cy, cx]
            d = np.hypot(gx - (cx + j[..., 0]), gy - (cy + j[..., 1]))
            f2 = np.where(d < f1, f1, np.minimum(f2, d))
            f1 = np.minimum(f1, d)
    return (f2 - f1) * cell  # in pixels


def marble(seed, out_path):
    rng = np.random.default_rng(seed)
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)

    # Stone: near black, rough like the original: charcoal clouds, lit bumps and grain.
    clouds = fbm(rng, W, H, 420, octaves=6)
    bumps = fbm(rng, W, H, 38, octaves=4, persistence=0.6)
    gy_, gx_ = np.gradient(bumps)
    light = np.clip((gx_ - gy_) * 60, -1, 1)  # light from the top left
    grain = rng.random((H, W)).astype(np.float32)
    stone = (
        0.02
        + 0.055 * np.clip((clouds - 0.4) * 2.2, 0, 1) ** 1.5
        + 0.012 * light * (0.4 + clouds)
        + 0.016 * np.clip(bumps - 0.55, 0, 1)
        + 0.012 * (grain - 0.5)
    )

    # Organic cracks: twice domain-warped cell borders at three scales, of varying width.
    w1x = (fbm(rng, W, H, 280, octaves=4) - 0.5) * 150
    w1y = (fbm(rng, W, H, 280, octaves=4) - 0.5) * 150
    w2x = (fbm(rng, W, H, 90, octaves=3) - 0.5) * 24
    w2y = (fbm(rng, W, H, 90, octaves=3) - 0.5) * 24
    X, Y = xs + w1x + w2x, ys + w1y + w2y
    big = worley_edges(rng, X * 0.85, Y * 1.15, 190)
    mid = worley_edges(rng, X, Y, 95)
    fine = worley_edges(rng, X + 31, Y + 17, 44)
    width = 0.7 + 1.6 * fbm(rng, W, H, 120, octaves=3) ** 2

    # Veins gather in diagonal drifts, like the original card; elsewhere the stone stays dark.
    drift = fbm(rng, W, H, 520, octaves=3)
    diag = 0.5 + 0.5 * np.sin((xs * 0.8 + ys) / 230 + rng.random() * 6.28)
    mask = np.clip((drift * 0.75 + diag * 0.35 - 0.6) * 3.0, 0, 1)
    faint = np.clip((drift - 0.35) * 2.5, 0, 1) * 0.28  # a few faint cracks everywhere
    breaks = np.clip((fbm(rng, W, H, 60, octaves=3) - 0.38) * 4, 0, 1)  # broken, not continuous

    core = (
        np.exp(-big / (width * 1.3)) * (0.6 + 0.4 * breaks)
        + 0.8 * np.exp(-mid / width) * breaks
        + 0.55 * np.exp(-fine / (width * 0.75)) * breaks * np.clip(mask * 1.4, 0, 1)
    )
    core = np.clip(core * np.maximum(mask, faint), 0, 1)

    core_img = Image.fromarray((core * 255).astype(np.uint8))
    glow_small = np.asarray(core_img.filter(ImageFilter.GaussianBlur(5)), np.float32) / 255
    glow_wide = np.asarray(core_img.filter(ImageFilter.GaussianBlur(26)), np.float32) / 255

    rgb = np.repeat(stone[..., None], 3, axis=2)
    gold_hot = np.array([1.0, 0.86, 0.52], np.float32)
    gold = np.array([0.93, 0.62, 0.18], np.float32)
    amber = np.array([0.85, 0.45, 0.08], np.float32)
    rgb += glow_wide[..., None] * amber * 1.1
    rgb += glow_small[..., None] * gold * 1.6
    rgb += core[..., None] ** 1.2 * gold_hot * 1.25

    rgb = np.clip(rgb, 0, 1)
    Image.fromarray((rgb * 255 + 0.5).astype(np.uint8)).save(out_path, dpi=(600, 600))
    print("saved", out_path)


if __name__ == "__main__":
    marble(int(sys.argv[1]), sys.argv[2])
