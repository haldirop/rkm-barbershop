"""Builds the RKM before/after video (1080 x 1920, 30 fps) from the two clips, the end-card layer and the music.

  python3 montage.py <before.mp4> <after.mp4> <overlay-dir> <muziek.wav> <effecten.wav> <out-dir> [--preview 0.5,4.0,...]

Natural and calm: the colours exactly as filmed, the whole picture (no zooming in), no text over the
footage. The before plays in real slow motion (it was filmed at 120 fps), a thin golden line wipes it
into the after on the drop of the music, the result from three sides, before and after one above the
other with both faces in view, then the end card to book online.
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
LENGTH = 19.0
NF = int(round(LENGTH * FPS))
HALF = H // 2

SCENES = [
    # before: side and back, in slow motion (0.7×, real frames from the 120 fps recording)
    dict(start=0, end=4, clip="before", src=(0.0, 2.8)),
    # after: one side, the back with the hand through the hair, the other side
    dict(start=4, end=7, clip="after", src=(0.0, 3.0)),
    dict(start=7, end=10, clip="after", src=(6.0, 9.6)),
    dict(start=10, end=13, clip="after", src=(13.2, 16.8)),
    # both, one above the other, faces in view
    dict(start=13, end=15, split=True),
    # end card on the blurred result
    dict(start=15, end=LENGTH, clip="after", src=(14.4, 16.6), endcard=True),
]
# (cut, type, seconds before, seconds after)
TRANSITIONS = [
    (4.0, "wipe", 0.2, 0.25),
    (7.0, "dissolve", 0.12, 0.12),
    (10.0, "dissolve", 0.12, 0.12),
    (13.0, "split", 0.0, 0.4),
    (15.0, "fade", 0.45, 0.45),
]
SLOW_PUSH = 0.03  # each shot moves in 3% over its length: alive, never close


def natural(rgb):
    """The colours as filmed: no grade at all."""
    return rgb.astype(np.float32) / 255


class Clip(promo.Clip):
    def frame(self, i):
        i = int(np.clip(i, 0, len(self.frames) - 1))
        if i not in self.cache:
            if len(self.cache) > 80:
                self.cache.clear()
            self.cache[i] = natural(self.frames[i])
        return self.cache[i]

    def at(self, t):
        """The nearest real frame (the before has 120 per second, so slow motion stays real)."""
        return self.frame(int(round(t * self.fps)))


def sharpen(img, amount=0.5, sigma=1.4):
    """Light unsharp mask after scaling up: crisp hair and fade, no halos."""
    blur = cv2.GaussianBlur(img, (0, 0), sigma)
    return np.clip(img + amount * (img - blur), 0, 1)


def full(clip, t_src, zoom=1.0, size=(W, H)):
    """The whole picture of a clip (9:16 like the video), scaled with Lanczos, centred."""
    img = clip.at(max(0.0, t_src))
    out_w, out_h = size
    scale = max(out_w / clip.w, out_h / clip.h) * zoom
    M = promo.affine(scale, 0, (clip.w / 2, clip.h / 2), (out_w / 2, out_h / 2))
    return sharpen(cv2.warpAffine(img, M, size, flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT_101))


def panel(clip, t_src, zoom, centre, size=(W, HALF)):
    """A whole head in a wide half of the screen: the clip a little smaller, on a blurred version
    of itself where it doesn't reach the edges."""
    img = clip.at(max(0.0, t_src))
    out_w, out_h = size
    base = max(out_w / clip.w, out_h / clip.h)
    M = promo.affine(base * zoom, 0, (centre[0] * clip.w, centre[1] * clip.h), (out_w / 2, out_h / 2))
    fg = cv2.warpAffine(img, M, size, flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT)
    mask = cv2.warpAffine(np.ones(img.shape[:2], np.float32), M, size, flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    mask = cv2.GaussianBlur(mask, (0, 0), 3)[..., None]
    bg_M = promo.affine(base * 1.2, 0, (centre[0] * clip.w, centre[1] * clip.h), (out_w / 2, out_h / 2))
    bg = cv2.GaussianBlur(cv2.warpAffine(img, bg_M, size, flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101), (0, 0), 24) * 0.55
    return sharpen(fg) * mask + bg * (1 - mask)


class Video:
    def __init__(self, before, after, ov_dir):
        self.clips = {"before": before, "after": after}
        self.ov_dir = ov_dir

    def overlay(self, s, i):
        return promo.load_overlay(self.ov_dir, s, i)

    def split(self, t):
        u = float(np.clip((t - 13.0) / 2.0, 0, 1))
        # The moments where the face is seen best, both looking the same way, the whole head centred.
        top = panel(self.clips["before"], 8.5 + 1.6 * u, 0.94 + 0.02 * u, (0.53, 0.45))
        bottom = panel(self.clips["after"], 14.8 + 2.0 * u, 0.83 + 0.02 * u, (0.53, 0.39))
        return top, bottom

    def shot(self, s, t, i):
        sc = SCENES[s]
        if sc.get("split"):
            top, bottom = self.split(t)
            return promo.over(np.concatenate([top, bottom], axis=0), self.overlay(s, i))
        clip = self.clips[sc["clip"]]
        u = (t - sc["start"]) / (sc["end"] - sc["start"])
        src_t = sc["src"][0] + u * (sc["src"][1] - sc["src"][0])
        frame = full(clip, src_t, 1.0 + SLOW_PUSH * float(np.clip(u, 0, 1)))
        if sc.get("endcard"):
            frame = cv2.GaussianBlur(frame, (0, 0), 16) * 0.2 + promo.GOLD_GLOW * 0.3
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
        if kind == "split":  # the halves slide in over the last shot
            q = promo.ease_out((t - cut) / after)
            out = self.shot(s_out, t, i) * (1 - 0.5 * q)
            top, bottom = self.split(t)
            dx = int(round(W * (1 - q)))
            if dx < W:
                out[:HALF, : W - dx] = top[:, dx:]  # from the left
                out[HALF:, dx:] = bottom[:, : W - dx]  # from the right
            return promo.over(out, self.overlay(s_in, i)) if q > 0.6 else out
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
    before_path, after_path, ov_dir, music, sfx, out_dir = args
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    video = Video(Clip(before_path), Clip(after_path), ov_dir)

    if preview:
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
    cover_frame = int(14.2 * FPS)  # before and after, one above the other
    for i in range(NF):
        frame = promo.to_u8(video.render(i))
        enc.stdin.write(frame.tobytes())
        if i == cover_frame:
            cv2.imwrite(str(out / "RKM-before-after-cover.jpg"), cv2.cvtColor(frame, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 95])
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
