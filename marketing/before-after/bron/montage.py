"""Builds the RKM before/after video (1080 x 1920, 30 fps, 12.5 s) from the two clips, the end-card layer and the music.

  python3 montage.py <before.mp4> <after.mp4> <overlay-dir> <muziek.wav> <effecten.wav> <out-dir> <model.onnx> [--preview 0.5,4.0,...]

Short, natural and sharp: every frame is upscaled 4x with Real-ESRGAN (opschalen.py) and scaled back
down to 1080 x 1920, the colours exactly as filmed, the whole picture (no zooming in), no text over the
footage. The before plays in real slow motion (it was filmed at 120 fps), a thin golden line wipes it
into the after on the drop of the music, the result from three sides, then the end card to book online.
The cover shows before and after one above the other, both faces in view.
Building blocks (geometry, loudness) come from the promo reel: ../../promo-reel/bron/montage.py.
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
LENGTH = 12.5
NF = int(round(LENGTH * FPS))
HALF = H // 2

SCENES = [
    # before: side and back, in slow motion (0.7×, real frames from the 120 fps recording)
    dict(start=0, end=3, clip="before", src=(0.0, 2.1)),
    # after: one side, the back with the hand through the hair, the other side with the face
    dict(start=3, end=5, clip="after", src=(0.0, 2.0)),
    dict(start=5, end=7, clip="after", src=(7.2, 9.2)),
    dict(start=7, end=9, clip="after", src=(14.6, 16.6)),
    # end card on the blurred result
    dict(start=9, end=LENGTH, clip="after", src=(15.0, 16.6), endcard=True),
]
# (cut, type, seconds before, seconds after)
TRANSITIONS = [
    (3.0, "wipe", 0.2, 0.25),
    (5.0, "dissolve", 0.12, 0.12),
    (7.0, "dissolve", 0.12, 0.12),
    (9.0, "fade", 0.45, 0.45),
]
SLOW_PUSH = 0.03  # each shot moves in 3% over its length: alive, never close


def natural(rgb):
    """The colours as filmed: no grade at all."""
    return rgb.astype(np.float32) / 255


class Clip(promo.Clip):
    """A recording, frame by frame; `sharp` frames are upscaled 4x by Real-ESRGAN (cached on disk)."""

    def __init__(self, path, name, upscaler):
        super().__init__(path)
        self.name, self.upscaler = name, upscaler

    def frame(self, i, sharp=True):
        i = int(np.clip(i, 0, len(self.frames) - 1))
        key = (i, sharp)
        if key not in self.cache:
            if len(self.cache) > 12:
                self.cache.clear()
            img = natural(self.frames[i])
            self.cache[key] = self.upscaler(img, f"{self.name}-{i:05d}") if sharp else img
        return self.cache[key]

    def at(self, t, sharp=True):
        """The nearest real frame (the before has 120 per second, so slow motion stays real)."""
        return self.frame(int(round(t * self.fps)), sharp)


def fit(img, M, size):
    """Scales the 4x frame down to the video: area averaging keeps it crisp without shimmer."""
    scale = float(np.hypot(M[0, 0], M[0, 1]))
    if scale < 1:
        small = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        M = M.copy()
        M[:, :2] /= scale
        img = small
    return cv2.warpAffine(img, M, size, flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT_101)


def full(clip, t_src, zoom=1.0, size=(W, H), sharp=True):
    """The whole picture of a clip (9:16 like the video), centred."""
    img = clip.at(max(0.0, t_src), sharp)
    h, w = img.shape[:2]
    out_w, out_h = size
    scale = max(out_w / w, out_h / h) * zoom
    M = promo.affine(scale, 0, (w / 2, h / 2), (out_w / 2, out_h / 2))
    return np.clip(fit(img, M, size), 0, 1)


def panel(clip, t_src, zoom, centre, size=(W, HALF)):
    """A whole head in a wide half of the screen (for the cover): the frame a little smaller, on a
    blurred version of itself where it doesn't reach the edges."""
    img = clip.at(max(0.0, t_src))
    h, w = img.shape[:2]
    out_w, out_h = size
    base = max(out_w / w, out_h / h)
    M = promo.affine(base * zoom, 0, (centre[0] * w, centre[1] * h), (out_w / 2, out_h / 2))
    fg = fit(img, M, size)
    mask = cv2.warpAffine(np.ones((h, w), np.float32), M, size, flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    mask = cv2.GaussianBlur(mask, (0, 0), 3)[..., None]
    bg_M = promo.affine(base * 1.2, 0, (centre[0] * w, centre[1] * h), (out_w / 2, out_h / 2))
    bg = cv2.GaussianBlur(fit(img, bg_M, size), (0, 0), 24) * 0.55
    return np.clip(fg * mask + bg * (1 - mask), 0, 1)


def cover(before, after, path):
    """Before above, after below, both looking the same way with the whole head in view, a golden line between."""
    top = panel(before, 9.0, 0.95, (0.53, 0.45))
    bottom = panel(after, 15.4, 0.84, (0.53, 0.39))
    img = np.concatenate([top, bottom], axis=0)
    x = np.linspace(0, 1, W, dtype=np.float32)[None, :, None]
    gold = np.array([0.73, 0.49, 0.13], np.float32) + (np.array([1.0, 0.95, 0.71], np.float32) - np.array([0.73, 0.49, 0.13], np.float32)) * (1 - np.abs(x - 0.5) * 2)
    img[HALF - 3:HALF + 3] = gold
    out = promo.to_u8(img)
    gem = np.array([[W // 2, HALF - 17], [W // 2 + 17, HALF], [W // 2, HALF + 17], [W // 2 - 17, HALF]], np.int32)
    cv2.fillConvexPoly(out, gem, (244, 207, 114), lineType=cv2.LINE_AA)
    cv2.imwrite(str(path), cv2.cvtColor(out, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 95])


class Video:
    def __init__(self, before, after, ov_dir):
        self.clips = {"before": before, "after": after}
        self.ov_dir = ov_dir

    def overlay(self, s, i):
        return promo.load_overlay(self.ov_dir, s, i)

    def shot(self, s, t, i):
        sc = SCENES[s]
        clip = self.clips[sc["clip"]]
        u = (t - sc["start"]) / (sc["end"] - sc["start"])
        src_t = sc["src"][0] + u * (sc["src"][1] - sc["src"][0])
        if sc.get("endcard"):  # blurred anyway: no upscaling needed
            frame = full(clip, src_t, 1.0, sharp=False)
            frame = cv2.GaussianBlur(frame, (0, 0), 16) * 0.2 + promo.GOLD_GLOW * 0.3
        else:
            frame = full(clip, src_t, 1.0 + SLOW_PUSH * float(np.clip(u, 0, 1)))
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
        if kind == "wipe":  # a thin golden line sweeps the before away, the after behind it
            p = (t - (cut - before)) / (before + after)
            x = int(round(W * (0.5 - 0.5 * np.cos(np.pi * p))))
            img = self.shot(s_out, t, i).copy()
            if x > 0:
                img[:, :x] = self.shot(s_in, t, i)[:, :x]
            cols = np.arange(W)
            glow = np.exp(-(((cols - x) / 14.0) ** 2)).astype(np.float32)[None, :, None]
            core = np.exp(-(((cols - x) / 2.2) ** 2)).astype(np.float32)[None, :, None]
            img = img * (1 - 0.45 * glow) + np.array([0.98, 0.78, 0.4], np.float32) * 0.45 * glow
            return img * (1 - core) + np.array([1.0, 0.95, 0.82], np.float32) * core
        if kind == "dissolve":
            q = (t - (cut - before)) / (before + after)
            q = q * q * (3 - 2 * q)
            return self.shot(s_out, t, i) * (1 - q) + self.shot(s_in, t, i) * q
        if kind == "fade":  # softly blurs and fades into the end card
            if t < cut:
                p = (t - (cut - before)) / before
                img = self.shot(s_out, t, i)
                return cv2.GaussianBlur(img, (0, 0), 0.1 + 14 * p * p) * (1 - 0.6 * p)
            q = (t - cut) / after
            return self.shot(s_in, t, i) * (0.4 + 0.6 * q * q * (3 - 2 * q))
        raise ValueError(kind)


def main():
    args = sys.argv[1:]
    preview = None
    if "--preview" in args:
        k = args.index("--preview")
        preview = [float(x) for x in args[k + 1].split(",")]
        args = args[:k] + args[k + 2:]
    before_path, after_path, ov_dir, music, sfx, out_dir, model = args
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    sys.path.insert(0, str(HERE))
    from opschalen import Upscaler

    upscaler = Upscaler(model, cache_dir=out / "cache")
    video = Video(Clip(before_path, "before", upscaler), Clip(after_path, "after", upscaler), ov_dir)

    if preview:
        if preview == [-1.0]:
            cover(video.clips["before"], video.clips["after"], out / "cover-preview.jpg")
            print("cover written")
            return
        for t in preview:
            i = min(NF - 1, int(round(t * FPS)))
            cv2.imwrite(str(out / f"preview-{t:05.2f}.png"), cv2.cvtColor(promo.to_u8(video.render(i)), cv2.COLOR_RGB2BGR))
        print("previews written")
        return

    silent = out / "video.mp4"
    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-maxrate", "14M", "-bufsize", "28M", "-tune", "film",
         "-profile:v", "high", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709",
         "-color_trc", "bt709", "-movflags", "+faststart", str(silent)],
        stdin=subprocess.PIPE)
    for i in range(NF):
        enc.stdin.write(promo.to_u8(video.render(i)).tobytes())
        if i % 30 == 0:
            print(f"  frame {i}/{NF}", flush=True)
    enc.stdin.close()
    enc.wait()
    cover(video.clips["before"], video.clips["after"], out / "RKM-before-after-cover.jpg")

    for wav, name, target in [(music, "RKM-before-after.mp4", -14.0), (sfx, "RKM-before-after-zonder-muziek.mp4", -17.0)]:
        norm = out / (Path(wav).stem + "-norm.wav")
        promo.loudnorm(wav, str(norm), target)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(silent), "-i", str(norm), "-map", "0:v", "-map", "1:a",
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
                        str(out / name)], check=True)
        print("saved", out / name)


if __name__ == "__main__":
    main()
