"""Builds the RKM promo reel (1080 x 1920, 30 fps) from the original clip, the text layer and the music.

  python3 montage.py <origineel.mov> <overlay-dir> <muziek.wav> <effecten.wav> <out-dir> [--preview 0.5,2.1,...]

Shots are cut from the one clip (each part of it used once), graded black/gold, with beat-synced zoom
bumps and six different transitions on the music: zoom punch, whip pan, light flash, spin, glitch and a
blur flash into the end card. --preview only writes PNGs of the given moments (seconds).
Needs: numpy, opencv-python-headless, ffmpeg.
"""
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

FPS = 30
W, H = 1080, 1920
LENGTH = 17.0
NF = int(LENGTH * FPS)

# Output scenes: time range, source range (seconds in the clip), zoom and centre (fractions of the clip).
SCENES = [
    dict(start=0, end=2, src=(4.4, 6.2), zoom=(1.32, 1.44), c0=(0.45, 0.30), c1=(0.48, 0.30)),   # hook: close-up
    dict(start=2, end=4, src=(0.0, 2.0), zoom=(1.14, 1.02), c0=(0.50, 0.42), c1=(0.50, 0.48)),   # wide, pull out
    dict(start=4, end=6, src=(2.4, 4.4), zoom=(1.00, 1.10), c0=(0.50, 0.50), c1=(0.55, 0.42)),   # push in
    dict(start=6, end=8, src=(6.2, 7.6), zoom=(1.46, 1.54), c0=(0.56, 0.30), c1=(0.57, 0.31)),   # detail, slow motion
    dict(start=8, end=11, src=(9.6, 13.15), zoom=(1.06, 1.14), c0=(0.50, 0.50), c1=(0.50, 0.50)),  # orbit under the hexagon light
    dict(start=11, end=13, src=(7.6, 9.6), zoom=(1.20, 1.04), c0=(0.55, 0.40), c1=(0.50, 0.46)),  # pull back, gold mirror
    dict(start=13, end=17, src=(4.6, 6.6), zoom=(1.22, 1.30), c0=(0.50, 0.34), c1=(0.50, 0.36), endcard=True),
]
# (cut time, type, seconds before, seconds after)
TRANSITIONS = [
    (2.0, "zoom", 0.22, 0.22),
    (4.0, "whip", 0.2, 0.2),
    (6.0, "flash", 0.12, 0.35),
    (8.0, "spin", 0.26, 0.26),
    (11.0, "glitch", 0.14, 0.2),
    (13.0, "blurflash", 0.4, 0.45),
]
IMPACTS = [0.0, 8.0, 13.0]   # camera shake (with the impacts in the music)
BUMPS = [b * 1.0 for b in range(1, 13)]  # zoom bump on beats 1 and 3

LUMA = np.array([0.2126, 0.7152, 0.0722], np.float32)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def ease_in(p):
    return p * p


def ease_out(p):
    return 1 - (1 - p) ** 3


# ------------------------------------------------------------------ source

def load_clip(path):
    info = json.loads(subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,nb_frames:format=duration",
         "-of", "json", path], capture_output=True, check=True, text=True).stdout)
    w, h = info["streams"][0]["width"], info["streams"][0]["height"]
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         capture_output=True, check=True).stdout
    frames = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)
    fps = len(frames) / float(info["format"]["duration"])
    return frames, fps


def grade(rgb):
    """Black-and-gold look: a little darker, S-curve, warm highlights, cool-neutral shadows, richer colour."""
    x = rgb.astype(np.float32) / 255
    x = (x * 0.92) ** 1.12
    x = x + 0.45 * (x * x * (3 - 2 * x) - x)
    lum = x @ LUMA
    hi = smoothstep(0.42, 1.0, lum)[..., None]
    lo = (1 - smoothstep(0.0, 0.4, lum))[..., None]
    x = x * (1 + hi * np.array([0.06, 0.02, -0.08], np.float32)) + lo * np.array([-0.012, -0.004, 0.006], np.float32)
    lum = (x @ LUMA)[..., None]
    x = lum + (x - lum) * 1.14
    return np.clip(x, 0, 1)


class Clip:
    def __init__(self, path):
        self.frames, self.fps = load_clip(path)
        self.h, self.w = self.frames.shape[1:3]
        self.cache = {}

    def frame(self, i):
        i = int(np.clip(i, 0, len(self.frames) - 1))
        if i not in self.cache:
            if len(self.cache) > 80:
                self.cache.clear()
            self.cache[i] = grade(self.frames[i])
        return self.cache[i]

    def at(self, t):
        """Frame at time t; blends neighbours for slow motion."""
        f = t * self.fps
        i0 = int(np.floor(f))
        a = f - i0
        if a < 0.1:
            return self.frame(i0)
        if a > 0.9:
            return self.frame(i0 + 1)
        return self.frame(i0) * (1 - a) + self.frame(i0 + 1) * a


# ------------------------------------------------------------------ geometry

def affine(scale, angle_deg, src_centre, dst_centre):
    """Matrix that puts src_centre at dst_centre, scaled and rotated around it."""
    a = np.deg2rad(angle_deg)
    c, s = np.cos(a) * scale, np.sin(a) * scale
    sx, sy = src_centre
    dx, dy = dst_centre
    return np.array([[c, -s, dx - c * sx + s * sy], [s, c, dy - s * sx - c * sy]], np.float32)


def warp(img, M, size=(W, H)):
    return cv2.warpAffine(img, M, size, flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT_101)


def cover_scale(angle_deg):
    """Extra scale so a rotated 9:16 frame still covers the whole frame."""
    a = abs(np.deg2rad(angle_deg))
    return max(np.cos(a) + (H / W) * np.sin(a), np.cos(a) + (W / H) * np.sin(a))


def frame_fx(img, zoom=1.0, angle=0.0, shift=(0.0, 0.0), zoom_blur=0.0, spin_blur=0.0, steps=9):
    """Transforms a finished frame around its centre, with radial (zoom) or rotational blur."""
    if zoom == 1 and angle == 0 and shift == (0.0, 0.0) and zoom_blur == 0 and spin_blur == 0:
        return img
    centre = (W / 2, H / 2)
    dst = (W / 2 + shift[0], H / 2 + shift[1])
    if zoom_blur <= 0.002 and spin_blur <= 0.2:
        return warp(img, affine(zoom, angle, centre, dst))
    acc = np.zeros_like(img)
    for k in range(steps):
        f = k / (steps - 1)
        acc += warp(img, affine(zoom * (1 + zoom_blur * f), angle + spin_blur * (f - 0.5), centre, dst))
    return acc / steps


# ------------------------------------------------------------------ layers

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 * 0.62 + ((yy - H / 2) / (H / 2)) ** 2)
VIGNETTE = (1 - 0.6 * np.clip((r - 0.4) / 0.75, 0, 1) ** 1.4)[..., None].astype(np.float32)
# darker top and bottom: the app's buttons and caption stay readable
EDGES = (1 - 0.32 * smoothstep(0.78, 1.0, yy / H) - 0.22 * (1 - smoothstep(0.0, 0.1, yy / H)))[..., None].astype(np.float32)
LOOK = VIGNETTE * EDGES
GOLD_GLOW = (np.exp(-(((xx - W / 2) / 520) ** 2 + ((yy - 760) / 620) ** 2))[..., None]
             * np.array([0.42, 0.27, 0.07], np.float32)).astype(np.float32)


def load_overlay(ov_dir, scene, i):
    p = Path(ov_dir) / f"s{scene}" / f"{i:04d}.png"
    if not p.exists():
        return None
    img = cv2.imread(str(p), cv2.IMREAD_UNCHANGED)
    rgba = cv2.cvtColor(img, cv2.COLOR_BGRA2RGBA).astype(np.float32) / 255
    return rgba


def over(base, rgba):
    if rgba is None:
        return base
    a = rgba[..., 3:4]
    return rgba[..., :3] * a + base * (1 - a)


def sharpen(img, amount=0.55, sigma=1.3):
    blur = cv2.GaussianBlur(img, (0, 0), sigma)
    return np.clip(img + amount * (img - blur), 0, 1)


def shake(t, i):
    off = np.zeros(2, np.float32)
    for c in IMPACTS:
        if 0 <= t - c < 0.5:
            amp = 22 * np.exp(-(t - c) / 0.12)
            rng = np.random.default_rng(i * 7 + 3)
            off += rng.uniform(-amp, amp, 2)
    return off


class Montage:
    def __init__(self, clip, ov_dir):
        self.clip, self.ov_dir = clip, ov_dir
        self.base = W / clip.w  # clip fills the frame at zoom 1 (576 → 1080 and 1024 → 1920)

    def shot(self, s, t, i):
        """Scene s at output time t: footage (graded, transformed) with its text layer."""
        sc = SCENES[s]
        u = (t - sc["start"]) / (sc["end"] - sc["start"])
        src_t = sc["src"][0] + u * (sc["src"][1] - sc["src"][0])
        img = self.clip.at(max(0.0, src_t))
        ue = float(np.clip(u, 0, 1))
        ease = ue * ue * (3 - 2 * ue)
        z = sc["zoom"][0] + (sc["zoom"][1] - sc["zoom"][0]) * ease
        cx = sc["c0"][0] + (sc["c1"][0] - sc["c0"][0]) * ease
        cy = sc["c0"][1] + (sc["c1"][1] - sc["c0"][1]) * ease
        if not sc.get("endcard"):
            for b in BUMPS:
                if sc["start"] + 0.3 < b < sc["end"] - 0.3 and 0 <= t - b < 0.4:
                    z *= 1 + 0.03 * np.exp(-(t - b) / 0.1)
        # keep the view inside the clip
        hw, hh = 0.5 / z, 0.5 / z
        cx, cy = np.clip(cx, hw, 1 - hw), np.clip(cy, hh, 1 - hh)
        off = shake(t, i)
        M = affine(self.base * z, 0, (cx * self.clip.w, cy * self.clip.h), (W / 2 + off[0], H / 2 + off[1]))
        frame = warp(img, M)
        frame = sharpen(frame)
        if sc.get("endcard"):
            frame = cv2.GaussianBlur(frame, (0, 0), 16) * 0.2 + GOLD_GLOW * 0.3
        frame = frame * LOOK
        return over(frame, load_overlay(self.ov_dir, s, i))

    def scene_at(self, t):
        for s, sc in enumerate(SCENES):
            if sc["start"] <= t < sc["end"]:
                return s
        return len(SCENES) - 1

    def render(self, i):
        t = i / FPS
        for cut, kind, before, after in TRANSITIONS:
            if cut - before <= t < cut + after:
                s_out = self.scene_at(cut - 1e-3)
                s_in = self.scene_at(cut + 1e-3)
                return np.clip(self.transition(kind, t, cut, before, after, s_out, s_in, i), 0, 1)
        return np.clip(self.shot(self.scene_at(t), t, i), 0, 1)

    def transition(self, kind, t, cut, before, after, s_out, s_in, i):
        if kind == "zoom":  # zoom punch through the cut
            if t < cut:
                p = ease_in((t - (cut - before)) / before)
                return frame_fx(self.shot(s_out, t, i), zoom=1 + 0.8 * p, zoom_blur=0.22 * p)
            q = ease_out((t - cut) / after)
            return frame_fx(self.shot(s_in, t, i), zoom=1 + 0.45 * (1 - q), zoom_blur=0.18 * (1 - q))

        if kind == "whip":  # whip pan to the left, both shots side by side with motion blur
            p = (t - (cut - before)) / (before + after)
            pos = (0.5 - 0.5 * np.cos(np.pi * p))  # 0 → 1
            x = -pos * W
            speed = np.sin(np.pi * p)
            a, b = self.shot(s_out, t, i), self.shot(s_in, t, i)
            strip = np.concatenate([a, b], axis=1)
            M = np.array([[1, 0, x], [0, 1, 0]], np.float32)
            out = cv2.warpAffine(strip, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)
            k = int(2 + 160 * speed)
            return cv2.blur(out, (k, 1)) if k > 2 else out

        if kind == "flash":  # golden light flash on a hard cut
            if t < cut:
                p = (t - (cut - before)) / before
                img, alpha = self.shot(s_out, t, i), ease_in(p) * 0.9
                img = img * (1 + 0.6 * ease_in(p))
            else:
                q = (t - cut) / after
                img, alpha = self.shot(s_in, t, i), np.exp(-q * 5)
                img = frame_fx(img, zoom=1 + 0.06 * (1 - ease_out(q)))
            light = np.array([1.0, 0.92, 0.74], np.float32)
            return img * (1 - alpha) + light * alpha

        if kind == "spin":  # spin with rotational blur, into the orbit shot
            if t < cut:
                p = ease_in((t - (cut - before)) / before)
                ang = 75 * p
                return frame_fx(self.shot(s_out, t, i), zoom=cover_scale(ang) * (1 + 0.25 * p), angle=ang, spin_blur=30 * p)
            q = ease_out((t - cut) / after)
            ang = -75 * (1 - q)
            return frame_fx(self.shot(s_in, t, i), zoom=cover_scale(ang) * (1 + 0.25 * (1 - q)), angle=ang, spin_blur=30 * (1 - q))

        if kind == "glitch":  # RGB split and sliced displacement, hard cut
            img = self.shot(s_out if t < cut else s_in, t, i)
            d = 1 - abs(t - cut) / (before if t < cut else after)
            rng = np.random.default_rng(i)
            shift = int(34 * d)
            out = img.copy()
            out[..., 0] = np.roll(img[..., 0], shift, axis=1)
            out[..., 2] = np.roll(img[..., 2], -shift, axis=1)
            for _ in range(int(3 + 8 * d)):
                y0 = int(rng.integers(0, H - 40))
                hgt = int(rng.integers(12, 140))
                out[y0:y0 + hgt] = np.roll(out[y0:y0 + hgt], int(rng.integers(-90, 90) * d), axis=1)
            return frame_fx(out, zoom=1 + 0.05 * d) * (1 + 0.25 * d)

        if kind == "blurflash":  # footage blurs and brightens, golden flash, end card
            gold = np.array([1.0, 0.93, 0.76], np.float32)
            if t < cut:
                p = (t - (cut - before)) / before
                img = self.shot(s_out, t, i)
                img = cv2.GaussianBlur(img, (0, 0), 0.1 + 22 * ease_in(p))
                img = frame_fx(img, zoom=1 + 0.12 * ease_in(p))
                alpha = 0.6 * ease_in(p) ** 2
            else:
                q = (t - cut) / after
                img = self.shot(s_in, t, i)
                alpha = 0.75 * np.exp(-q * 7)
            return img * (1 - alpha) + gold * alpha
        raise ValueError(kind)


def grain(img, i, amount=0.011):
    rng = np.random.default_rng(1000 + i)
    n = rng.standard_normal((H // 2, W // 2)).astype(np.float32)
    n = cv2.resize(n, (W, H), interpolation=cv2.INTER_LINEAR)[..., None]
    return np.clip(img + n * amount, 0, 1)


def to_u8(img):
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)


LOGO = Path(__file__).resolve().parents[3] / "src" / "assets" / "rkm-mark.png"


def make_cover(frame_rgb, path, width=420, top=290):
    """Cover image: the hook frame with the logo on top, so the post is recognisable in the profile grid."""
    logo = cv2.cvtColor(cv2.imread(str(LOGO), cv2.IMREAD_UNCHANGED), cv2.COLOR_BGRA2RGBA).astype(np.float32) / 255
    logo = cv2.resize(logo, (width, round(width * logo.shape[0] / logo.shape[1])), interpolation=cv2.INTER_AREA)
    img = frame_rgb.astype(np.float32) / 255
    x, y = (W - width) // 2, top
    h, w = logo.shape[:2]
    shadow = np.zeros((H, W), np.float32)
    shadow[y + 8:y + 8 + h, x:x + w] = logo[..., 3] * 0.85
    shadow = cv2.GaussianBlur(shadow, (0, 0), 18)[..., None]
    img = img * (1 - shadow)
    region = img[y:y + h, x:x + w]
    a = logo[..., 3:4]
    img[y:y + h, x:x + w] = logo[..., :3] * a + region * (1 - a)
    cv2.imwrite(str(path), cv2.cvtColor(to_u8(img), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 94])


# ------------------------------------------------------------------ audio

def loudnorm(src, dst, target=-14.0):
    """Two-pass loudness normalisation for social media (-14 LUFS, true peak -1.5 dB)."""
    flt = f"loudnorm=I={target}:TP=-1.5:LRA=11"
    res = subprocess.run(["ffmpeg", "-hide_banner", "-i", src, "-af", flt + ":print_format=json", "-f", "null", "-"],
                         capture_output=True, text=True)
    m = json.loads(res.stderr[res.stderr.rindex("{"):res.stderr.rindex("}") + 1])
    flt2 = (f"{flt}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
            f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af", flt2, "-ar", "48000", dst], check=True)


# ------------------------------------------------------------------ main

def main():
    args = sys.argv[1:]
    preview = None
    if "--preview" in args:
        k = args.index("--preview")
        preview = [float(x) for x in args[k + 1].split(",")]
        args = args[:k] + args[k + 2:]
    clip_path, ov_dir, music, sfx, out_dir = args
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    m = Montage(Clip(clip_path), ov_dir)

    if preview:
        for t in preview:
            i = min(NF - 1, int(round(t * FPS)))
            cv2.imwrite(str(out / f"preview-{t:05.2f}.png"), cv2.cvtColor(to_u8(grain(m.render(i), i)), cv2.COLOR_RGB2BGR))
        print("previews written")
        return

    video = out / "video.mp4"
    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-maxrate", "10M", "-bufsize", "20M",
         "-profile:v", "high", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709",
         "-color_trc", "bt709", "-movflags", "+faststart", str(video)],
        stdin=subprocess.PIPE)
    cover_frame = int(1.7 * FPS)
    for i in range(NF):
        frame = to_u8(grain(m.render(i), i))
        enc.stdin.write(frame.tobytes())
        if i == cover_frame:
            make_cover(frame, out / "RKM-promo-cover.jpg")
        if i % 60 == 0:
            print(f"  frame {i}/{NF}", flush=True)
    enc.stdin.close()
    enc.wait()

    # effects only: a little quieter, it gets mixed with a song in the app
    for wav, name, target in [(music, "RKM-promo-reel.mp4", -14.0), (sfx, "RKM-promo-reel-zonder-muziek.mp4", -17.0)]:
        norm = out / (Path(wav).stem + "-norm.wav")
        loudnorm(wav, str(norm), target)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-i", str(norm), "-map", "0:v", "-map", "1:a",
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
                        str(out / name)], check=True)
        print("saved", out / name)


if __name__ == "__main__":
    main()
