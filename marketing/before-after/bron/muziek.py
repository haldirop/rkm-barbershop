"""Original beat for the RKM before/after video: 120 BPM in A minor. A muffled, tense intro with a
3-2-1 countdown under the "before", a drop with an impact on the reveal, and the full beat under
the "after" and the end card. Everything is synthesised here (instruments as in the promo reel:
no samples, no third-party music), so it can be used freely on social media.

Usage: python3 muziek.py out-dir      → muziek.wav (beat + effects) and effecten.wav (effects only)
"""
import sys
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
BPM = 120
BEAT = 60 / BPM            # 0.5 s
BAR = 4 * BEAT             # 2 s
LENGTH = 19.0              # video length
REVEAL = 4.0               # before → after
CUTS = [4.0, 7.0, 10.0, 13.0, 15.0]  # transitions in the video
END_CARD = 15.0
rng = np.random.default_rng(12)

N = int(SR * (LENGTH + 0.05))
t_all = np.arange(N) / SR


def buf():
    return np.zeros((N, 2), np.float32)


def place(target, sound, at, gain=1.0, pan=0.0):
    """Adds a mono or stereo sound at time `at` (s), with equal-power panning for mono."""
    i = int(round(at * SR))
    if i >= N:
        return
    if sound.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sound = np.stack([sound * l, sound * r], axis=1) * np.sqrt(2)
    n = min(len(sound), N - i)
    target[i:i + n] += gain * sound[:n]


def env_exp(n, decay):
    return np.exp(-np.arange(n) / (decay * SR)).astype(np.float32)


def filt(x, kind, freq, order=2):
    sos = butter(order, freq, btype=kind, fs=SR, output="sos")
    return sosfilt(sos, x, axis=0).astype(np.float32)


def noise(n):
    return rng.standard_normal(n).astype(np.float32)


def note_hz(name):
    names = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4, "F#": -3, "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[pitch] + 12 * (octave - 4)) / 12)


# ---------------------------------------------------------------- instruments

def kick808(freq, length=1.1):
    """Punchy 808: fast pitch drop to the note, long tail, saturated so phones hear it too."""
    n = int(length * SR)
    t = np.arange(n) / SR
    f = freq + (freq * 5) * np.exp(-t / 0.028)
    phase = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(phase) * np.exp(-t / 0.55)
    body *= np.minimum(1, (length - t) / 0.08)  # no click at the end
    click = filt(noise(n), "highpass", 2500) * np.exp(-t / 0.004) * 0.35
    return np.tanh(2.2 * body + click).astype(np.float32) * 0.8


def snare():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.45
    body = filt(noise(n), "bandpass", [900, 7000]) * np.exp(-t / 0.13) * 0.8
    clap = np.zeros(n, np.float32)
    for k, d in enumerate([0, 0.011, 0.022]):  # three hands
        i = int(d * SR)
        seg = filt(noise(n - i), "bandpass", [1000, 5000]) * np.exp(-np.arange(n - i) / SR / (0.012 if k < 2 else 0.16))
        clap[i:] += seg * 0.55
    return np.tanh(tone + body + clap).astype(np.float32) * 0.7


def hat(open_=False):
    n = int((0.32 if open_ else 0.07) * SR)
    t = np.arange(n) / SR
    x = filt(noise(n), "highpass", 7500, order=4) * np.exp(-t / (0.11 if open_ else 0.018))
    return x.astype(np.float32) * (0.32 if open_ else 0.28)


def bell(freq, length=0.9):
    """FM bell / pluck, the classic dark trap lead."""
    n = int(length * SR)
    t = np.arange(n) / SR
    index = 2.4 * np.exp(-t / 0.18)
    mod = np.sin(2 * np.pi * freq * 3.5 * t) * index
    x = np.sin(2 * np.pi * freq * t + mod) * np.exp(-t / 0.42)
    x += 0.25 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t / 0.15)
    x *= np.minimum(1, t / 0.002)
    return x.astype(np.float32) * 0.32


def pad_chord(freqs, length):
    """Soft detuned-saw pad, low-passed; slow attack and release."""
    n = int(length * SR)
    t = np.arange(n) / SR
    x = np.zeros(n, np.float32)
    for f in freqs:
        for det in (-0.12, 0.0, 0.12):
            ff = f * 2 ** (det / 12)
            x += (2 * ((t * ff) % 1) - 1).astype(np.float32)
    x = filt(x, "lowpass", 1400, order=2)
    a = np.minimum(1, t / 0.25) * np.minimum(1, (length - t) / 0.3)
    return (x * a / (3 * len(freqs))).astype(np.float32) * 0.5


def whoosh(length=0.6, peak=0.42, up=True):
    """Filtered-noise sweep that peaks at `peak` s (the cut), panning across."""
    n = int(length * SR)
    t = np.arange(n) / SR
    bands = np.geomspace(250, 9000, 14)
    src = noise(n)
    out = np.zeros(n, np.float32)
    pos = np.clip(t / length, 0, 1)
    centre = pos if up else 1 - pos
    for k, fc in enumerate(bands):
        b = filt(src, "bandpass", [fc / 1.25, min(fc * 1.25, SR / 2 - 100)])
        g = np.exp(-((k / (len(bands) - 1) - centre) ** 2) / 0.02)
        out += b * g
    amp = np.where(t < peak, (t / peak) ** 2.2, np.exp(-(t - peak) / 0.09))
    out *= amp
    out /= np.abs(out).max() + 1e-9
    pan = np.linspace(-0.8, 0.8, n)
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    return (np.stack([out * l, out * r], axis=1) * np.sqrt(2) * 0.5).astype(np.float32)


def riser(length=1.0):
    n = int(length * SR)
    t = np.arange(n) / SR
    x = filt(noise(n), "highpass", 1500) * (t / length) ** 3
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1800 * (t / length) ** 2) / SR) * (t / length) ** 3 * 0.25
    x = x / (np.abs(x).max() + 1e-9) * 0.5 + sweep
    return x.astype(np.float32) * 0.6


def impact(length=2.2):
    n = int(length * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(38 + 120 * np.exp(-t / 0.05)) / SR) * np.exp(-t / 0.7)
    crash = filt(noise(n), "highpass", 3000) * np.exp(-t / 0.5) * 0.35
    hit = filt(noise(n), "lowpass", 900) * np.exp(-t / 0.08) * 0.8
    return np.tanh(1.6 * (boom + crash + hit)).astype(np.float32) * 0.85


def reverb(x, seconds=1.4, mix=0.25, tone=5000):
    """Simple stereo convolution reverb with a dark, decaying noise tail."""
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.stack([noise(n), noise(n)], axis=1) * np.exp(-t / (seconds / 5))[:, None]
    ir = filt(ir, "lowpass", tone)
    ir[: int(0.012 * SR)] = 0  # pre-delay
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    wet = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    return (x * (1 - mix) + wet * mix * 2.2).astype(np.float32)


def delay(x, seconds, feedback=0.35, mix=0.3):
    out = x.copy()
    d = int(seconds * SR)
    echo = x.copy()
    for k in range(1, 5):
        echo = np.roll(echo, d, axis=0)
        echo[:d] = 0
        echo = echo[:, ::-1] * feedback  # ping-pong
        out += echo * mix / feedback
    return out



# ---------------------------------------------------------------- arrangement

CHORDS = {  # bar → (808 root, pad notes, bell notes)
    "Am": ("A1", ["A3", "C4", "E4"], ["A4", "E5", "A5", "C6"]),
    "F": ("F1", ["F3", "A3", "C4"], ["F4", "C5", "F5", "A5"]),
    "C": ("C2", ["G3", "C4", "E4"], ["C5", "G5", "C6", "E6"]),
    "G": ("G1", ["G3", "B3", "D4"], ["G4", "D5", "G5", "B5"]),
    "Dm": ("D2", ["F3", "A3", "D4"], ["D5", "A5", "D6", "F6"]),
    "E": ("E1", ["G#3", "B3", "E4"], ["E5", "B5", "E6", "G#5"]),
}
# before (2 bars) | after (4.5 bars) | one above the other (1 bar) | end card (2 bars)
BARS = ["Am", "E", "Am", "F", "C", "G", "Dm", "F", "E", "Am"]

intro, drums, bass, keys, fx = buf(), buf(), buf(), buf(), buf()
sidechain = np.ones(N, np.float32)


def duck(at, depth=0.6, release=0.22):
    i = int(at * SR)
    n = min(int(0.6 * SR), N - i)
    if n <= 0:
        return
    t = np.arange(n) / SR
    sidechain[i:i + n] = np.minimum(sidechain[i:i + n], 1 - depth * np.exp(-t / release))


silence = (REVEAL - BEAT / 2, REVEAL)  # half a beat of nothing right before the reveal


def quiet(at):
    return silence[0] - 1e-6 <= at < silence[1] - 1e-6


for b, name in enumerate(BARS):
    start = b * BAR
    if start >= LENGTH:
        break
    root, pad_notes, bell_notes = CHORDS[name]
    before = start < REVEAL
    pattern = [0, None, 1, 2, None, 3, 1, None] if b % 2 == 0 else [0, None, 2, None, 1, 3, None, 2]

    if before:
        # Muffled and sparse: pad, bells and a soft kick on the one; the low-pass comes in the mix.
        place(intro, pad_chord([note_hz(x) for x in pad_notes], BAR + 0.3), start, 0.5)
        for e, idx in enumerate(pattern):
            at = start + e * BEAT / 2
            if idx is not None and not quiet(at):
                place(intro, bell(note_hz(bell_notes[idx])), at, 0.9, pan=(-0.3 if e % 2 else 0.3))
        place(intro, kick808(note_hz(root), 0.9), start, 0.8)
        for e in range(0, 8, 2):
            if not quiet(start + e * BEAT / 2):
                place(intro, hat(), start + e * BEAT / 2, 0.6, pan=0.25)
        continue

    # After the reveal: the full beat.
    kicks = [0.0, 1.75] if b % 2 == 0 else [0.0, 1.25, 1.75]
    for k in kicks:
        at = start + k
        if at < LENGTH:
            place(bass, kick808(note_hz(root), 0.9 if k == 0 else 0.45), at, 0.9 if k == 0 else 0.75)
            duck(at)
    if start + 2 * BEAT < LENGTH:
        place(drums, snare(), start + 2 * BEAT, 0.9)
    for e in range(8):
        at = start + e * BEAT / 2
        if at >= LENGTH:
            continue
        next_cut = min([c for c in CUTS if c > at] or [99])
        if next_cut - at <= BEAT / 2 + 1e-6 and next_cut < 99:
            steps = 3 if (b % 2) else 4
            for s in range(steps):
                place(drums, hat(), at + s * (BEAT / 2) / steps, 0.55 + 0.15 * s / steps, pan=0.25)
        else:
            place(drums, hat(), at, 1.0 if e % 2 == 0 else 0.7, pan=0.25)
    if b % 2 == 1:
        place(drums, hat(open_=True), start + 3.5 * BEAT, 0.6, pan=-0.2)
    place(keys, pad_chord([note_hz(x) for x in pad_notes], BAR + 0.3), start, 0.38)
    for e, idx in enumerate(pattern):
        at = start + e * BEAT / 2
        if idx is not None and at < LENGTH:
            place(keys, bell(note_hz(bell_notes[idx])), at, 0.9 - 0.12 * (e % 2), pan=(-0.3 if e % 2 else 0.3))

# Countdown 3 · 2 · 1 on the last beats before the reveal, rising.
for k, at in enumerate([2.5, 3.0, 3.5]):
    place(drums, snare(), at, 0.55 + 0.15 * k)
    place(fx, kick808(note_hz(["E2", "G2", "A2"][k]), 0.25), at, 0.35)
place(fx, riser(2.0), REVEAL - 2.0, 0.85)
place(fx, impact(2.6), REVEAL, 1.0)                         # the reveal
place(fx, whoosh(0.6, 0.35, up=True), REVEAL - 0.35, 0.8)
for c in CUTS[1:-1]:
    place(fx, whoosh(0.55, 0.42, up=(c != 10.0)), c - 0.42, 0.45)  # soft: the cuts are calm dissolves
place(fx, riser(1.2), END_CARD - 1.2, 0.6)
place(fx, impact(2.4), END_CARD, 0.75)
place(fx, impact(1.2), 18.0, 0.5)                           # last hit

# ---------------------------------------------------------------- mix

# The "before" sounds muffled, as if behind a door; the reveal opens it up.
intro = filt(intro, "lowpass", 650, order=2)
intro = reverb(intro, 1.6, 0.3)
intro[int(REVEAL * SR):] *= 0.0
keys = delay(keys, 3 * BEAT / 4, feedback=0.3, mix=0.22)
keys = reverb(keys, 1.8, 0.3)
drums = reverb(drums, 0.9, 0.12, tone=7000)
fx = reverb(fx, 1.6, 0.18)
keys *= sidechain[:, None]

bass = filt(bass, "highpass", 32)
music = intro * 0.9 + drums * 1.7 + bass * 0.5 + keys * 0.72
fade = np.ones(N, np.float32)
fade_len = int(0.5 * SR)
fade[-fade_len:] = np.linspace(1, 0, fade_len) ** 1.5
music *= fade[:, None]
fx_only = fx * fade[:, None]
mix = music + fx


def master(x):
    x = filt(x, "highpass", 28)
    peak = np.abs(x).max()
    x = x / peak * 1.25
    x = np.tanh(x)            # gentle saturation / limiting
    return (x / np.abs(x).max() * 0.89).astype(np.float32)


out = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
out.mkdir(parents=True, exist_ok=True)
for name, sig in [("muziek.wav", master(mix)), ("effecten.wav", master(fx_only))]:
    pcm = (np.clip(sig, -1, 1) * 32767).astype("<i2")
    import wave

    with wave.open(str(out / name), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print("saved", out / name, f"{len(sig) / SR:.2f}s")
