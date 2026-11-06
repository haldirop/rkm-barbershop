"""Builds the RKM before/after video (1080 x 1920, 30 fps) from the two clips, the text layer and the music.

  python3 montage.py <before.mp4> <after.mp4> <overlay-dir> <muziek.wav> <effecten.wav> <out-dir> [--preview 0.5,4.0,...]

The "before" plays muted and grey with a 3-2-1 countdown, a golden line wipes it away into the
"after" (rich black/gold) on the drop, then the result from every side, both one above the other,
and an end card to book online. Building blocks (grading, transitions, grain, loudness) come from
the promo reel: ../../promo-reel/bron/montage.py.
Needs: numpy, opencv-python-headless, ffmpeg.
"""
import importlib.util
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("promo_montage", HERE.parents[1] / "promo-reel" / "bron" / "montage.py")
promo = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(promo)

FPS, W, H = promo.FPS, promo.W, promo.H
LENGTH = 18.5
NF = int(round(LENGTH * FPS))
HALF = H // 2

SCENES = [
    # before: the orbit around the long hair, a bit faster
    dict(start=0, end=4, clip="before", src=(0.0, 6.0), zoom=(1.10, 1.20), c0=(0.48, 0.36), c1=(0.50, 0.36)),
    # after: side, back with the hand through the hair, the fade up close, the other side
    dict(start=4, end=6, clip="after", src=(0.0, 3.0), zoom=(1.22, 1.12), c0=(0.48, 0.32), c1=(0.48, 0.32)),
    dict(start=6, end=8, clip="after", src=(5.8, 8.4), zoom=(1.10, 1.20), c0=(0.50, 0.38), c1=(0.50, 0.40)),
    dict(start=8, end=10, clip="after", src=(9.3, 11.1), zoom=(1.55, 1.68), c0=(0.50, 0.48), c1=(0.50, 0.50)),
    dict(start=10, end=12, clip="after", src=(13.2, 17.0), zoom=(1.16, 1.08), c0=(0.45, 0.33), c1=(0.45, 0.33)),
    # both, one above the other
    dict(start=12, end=14, split=True),
    # end card on the blurred result
    dict(start=14, end=LENGTH, clip="after", src=(14.4, 16.6), zoom=(1.25, 1.32), c0=(0.45, 0.33), c1=(0.45, 0.33), endcard=True),
]
# (cut, type, seconds before, seconds after)
TRANSITIONS = [
    (4.0, "wipe", 0.18, 0.2),
    (6.0, "zoom", 0.2, 0.22),
    (8.0, "whip", 0.18, 0.18),
    (10.0, "flash", 0.12, 0.3),
    (12.0, "split", 0.0, 0.4),
    (14.0, "blurflash", 0.4, 0.45),
]
IMPACTS = [4.0, 14.0]
BUMPS = [2.5, 3.0, 3.5, 5.0, 7.0, 9.0, 11.0, 13.0]  # the countdown, then beats 1 and 3


def before_grade(rgb):
    """The "before": grey, flat and a little cold, so the after can shine."""
    x = rgb.astype(np.float32) / 255
    lum = (x @ promo.LUMA)[..., None]
    x = lum + (x - lum) * 0.42
    x = 0.05 + x * 0.84
    x = x * np.array([0.97, 1.0, 1.04], np.float32)
    return np.clip(x, 0, 1)


class Clip(promo.Clip):
    def __init__(self, path, grade):
        super().__init__(path)
        self.grade = grade

    def frame(self, i):
        i = int(np.clip(i, 0, len(self.frames) - 1))
        if i not in self.cache:
            if len(self.cache) > 80:
                self.cache.clear()
            self.cache[i] = self.grade(self.frames[i])
        return self.cache[i]


def view(clip, t_src, zoom, centre, size=(W, H), shift=(0.0, 0.0)):
    """A graded, sharpened frame of a clip at a source time, framed around `centre` (fractions)."""
    img = clip.at(max(0.0, t_src))
    out_w, out_h = size
    base = max(out_w / clip.w, out_h / clip.h)
    hw, hh = out_w / (2 * base * zoom * clip.w), out_h / (2 * base * zoom * clip.h)
    cx, cy = np.clip(centre[0], hw, 1 - hw), np.clip(centre[1], hh, 1 - hh)
    M = promo.affine(base * zoom, 0, (cx * clip.w, cy * clip.h), (out_w / 2 + shift[0], out_h / 2 + shift[1]))
    return promo.sharpen(promo.warp(img, M, size))


def panel(clip, t_src, zoom, centre, size=(W, HALF)):
    """A whole head in a wide half of the screen: the clip a little smaller (zoom < 1), on a
    blurred, darkened version of itself where it doesn't reach the edges."""
    img = clip.at(max(0.0, t_src))
    out_w, out_h = size
    base = max(out_w / clip.w, out_h / clip.h)
    M = promo.affine(base * zoom, 0, (centre[0] * clip.w, centre[1] * clip.h), (out_w / 2, out_h / 2))
    fg = cv2.warpAffine(img, M, size, flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT)
    mask = cv2.warpAffine(np.ones(img.shape[:2], np.float32), M, size, flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    mask = cv2.GaussianBlur(mask, (0, 0), 3)[..., None]
    bg = cv2.GaussianBlur(view(clip, t_src, 1.15, centre, size), (0, 0), 22) * 0.45
    return promo.sharpen(fg) * mask + bg * (1 - mask)


class Video:
    def __init__(self, before, after, ov_dir):
        self.clips = {"before": before, "after": after}
        self.ov_dir = ov_dir

    def overlay(self, s, i):
        return promo.load_overlay(self.ov_dir, s, i)

    def shake(self, t, i):
        off = np.zeros(2, np.float32)
        for c in IMPACTS:
            if 0 <= t - c < 0.5:
                amp = 24 * np.exp(-(t - c) / 0.12)
                off += np.random.default_rng(i * 7 + 3).uniform(-amp, amp, 2)
        return off

    def split(self, t, i, slide=1.0):
        """Before on top, after below; `slide` 0 → 1 brings the halves in from the sides."""
        u = float(np.clip((t - 12.0) / 2.0, 0, 1))
        # The moments where the face is seen best, both looking the same way, the whole head
        # (hair to chin) centred in its half with room around it; slowed down a little.
        top = panel(self.clips["before"], 8.5 + 1.2 * u, 0.94 + 0.03 * u, (0.53, 0.45))
        bottom = panel(self.clips["after"], 14.8 + 1.2 * u, 0.83 + 0.03 * u, (0.53, 0.39))
        return top, bottom

    def shot(self, s, t, i):
        sc = SCENES[s]
        if sc.get("split"):
            top, bottom = self.split(t, i)
            frame = np.concatenate([top, bottom], axis=0) * promo.LOOK
            return promo.over(frame, self.overlay(s, i))
        clip = self.clips[sc["clip"]]
        u = (t - sc["start"]) / (sc["end"] - sc["start"])
        src_t = sc["src"][0] + u * (sc["src"][1] - sc["src"][0])
        ue = float(np.clip(u, 0, 1))
        ease = ue * ue * (3 - 2 * ue)
        z = sc["zoom"][0] + (sc["zoom"][1] - sc["zoom"][0]) * ease
        centre = tuple(sc["c0"][k] + (sc["c1"][k] - sc["c0"][k]) * ease for k in range(2))
        if not sc.get("endcard"):
            for b in BUMPS:
                if sc["start"] + 0.25 < b < sc["end"] - 0.2 and 0 <= t - b < 0.4:
                    z *= 1 + (0.05 if b < 4 else 0.03) * np.exp(-(t - b) / 0.1)
        frame = view(clip, src_t, z, centre, shift=tuple(self.shake(t, i)))
        if sc.get("endcard"):
            frame = cv2.GaussianBlur(frame, (0, 0), 16) * 0.2 + promo.GOLD_GLOW * 0.3
        frame = frame * promo.LOOK
        return promo.over(frame, self.overlay(s, i))

    def scene_at(self, t):
        for s, sc in enumerate(SCENES):
            if sc["start"] <= t < sc["end"]:
                return s
        return len(SCENES) - 1

    def render(self, i):
        t = i / FPS
        for cut, kind, before, after in TRANSITIONS:
            if cut - before <= t < cut + after:
                return np.clip(self.transition(kind, t, cut, before, after, self.scene_at(cut - 1e-3), self.scene_at(cut + 1e-3), i), 0, 1)
        return np.clip(self.shot(self.scene_at(t), t, i), 0, 1)

    def transition(self, kind, t, cut, before, after, s_out, s_in, i):
        if kind == "wipe":  # a golden line sweeps the before away, the after behind it
            p = (t - (cut - before)) / (before + after)
            x = int(round(W * (0.5 - 0.5 * np.cos(np.pi * p))))
            img = self.shot(s_out, t, i).copy()
            if x > 0:
                img[:, :x] = self.shot(s_in, t, i)[:, :x]
            glow = np.exp(-(((np.arange(W) - x) / 26.0) ** 2)).astype(np.float32)[None, :, None]
            core = np.exp(-(((np.arange(W) - x) / 4.0) ** 2)).astype(np.float32)[None, :, None]
            gold = np.array([1.0, 0.82, 0.42], np.float32)
            img = img * (1 - 0.65 * glow) + gold * 0.65 * glow
            img = img * (1 - core) + np.array([1.0, 0.97, 0.86], np.float32) * core
            flash = 0.55 * np.exp(-(((t - cut) / 0.07) ** 2))
            return img * (1 - flash) + np.array([1.0, 0.93, 0.76], np.float32) * flash
        if kind == "split":  # the halves slide in over the last shot
            q = promo.ease_out((t - cut) / after)
            back = self.shot(s_out, t, i) * (1 - 0.5 * q)
            top, bottom = self.split(t, i)
            out = back.copy()
            top, bottom = top * promo.LOOK[:HALF], bottom * promo.LOOK[HALF:]
            dx = int(round(W * (1 - q)))
            if dx < W:
                out[:HALF, : W - dx] = top[:, dx:]  # from the left
                out[HALF:, dx:] = bottom[:, : W - dx]  # from the right
            return promo.over(out, self.overlay(s_in, i)) if q > 0.6 else out
        # zoom, whip, flash and blurflash work as in the promo reel
        return promo.Montage.transition(self, kind, t, cut, before, after, s_out, s_in, i)


def main():
    args = sys.argv[1:]
    preview = None
    if "--preview" in args:
        k = args.index("--preview")
        preview = [float(x) for x in args[k + 1].split(",")]
        args = args[:k] + args[k + 2:]
    before_path, after_path, ov_dir, music, sfx, out_dir = args
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    video = Video(Clip(before_path, before_grade), Clip(after_path, promo.grade), ov_dir)

    if preview:
        for t in preview:
            i = min(NF - 1, int(round(t * FPS)))
            cv2.imwrite(str(out / f"preview-{t:05.2f}.png"), cv2.cvtColor(promo.to_u8(promo.grain(video.render(i), i)), cv2.COLOR_RGB2BGR))
        print("previews written")
        return

    silent = out / "video.mp4"
    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-maxrate", "10M", "-bufsize", "20M",
         "-profile:v", "high", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709",
         "-color_trc", "bt709", "-movflags", "+faststart", str(silent)],
        stdin=subprocess.PIPE)
    cover_frame = int(13.3 * FPS)  # before and after, one above the other
    for i in range(NF):
        frame = promo.to_u8(promo.grain(video.render(i), i))
        enc.stdin.write(frame.tobytes())
        if i == cover_frame:
            cv2.imwrite(str(out / "RKM-before-after-cover.jpg"), cv2.cvtColor(frame, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 94])
        if i % 60 == 0:
            print(f"  frame {i}/{NF}", flush=True)
    enc.stdin.close()
    enc.wait()

    for wav, name, target in [(music, "RKM-before-after.mp4", -14.0), (sfx, "RKM-before-after-zonder-muziek.mp4", -17.0)]:
        norm = out / (Path(wav).stem + "-norm.wav")
        promo.loudnorm(wav, str(norm), target)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(silent), "-i", str(norm), "-map", "0:v", "-map", "1:a",
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
                        str(out / name)], check=True)
        print("saved", out / name)


if __name__ == "__main__":
    main()
