#!/usr/bin/env python3
"""Makes Lucy's sprite sheet, assets/source/lucy_sheet.png, from her pictures and videos.

    python3 tools/lucy_sheet.py      # then: npm run atlas

The sources are in assets/source/lucy/: standing.png (one frame, standing) and strike_1.mp4
(she raises her guard and jabs again and again). Each picture is cut out of its white
background (from the edges inwards, keeping only the figure, so the video's watermark goes
too), scaled so that she is as tall as Raithwyn (356 sheet px, ears to boots) and put in a row
of the sheet, the boots of every frame on the row's bottom line. Rows, top to bottom, are in
ROWS; the video frames picked for each row in PICKS.
"""
import subprocess
import sys
import tempfile
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/source/lucy"
sys.path.insert(0, str(Path(__file__).resolve().parent))
from defringe import defringe  # noqa: E402

TALL = 356  # sheet px, ears to boots, as Raithwyn
# video frames (from 1) for the two jabs: guard, the fist going out, out, coming back, guard
PICKS = {
    "punch1": [34, 36, 38, 40, 43],
    "punch2": [58, 60, 62, 64, 67],
}
ROWS = ["idle", "punch1", "punch2"]


def flood(mask, seeds):
    h, w = mask.shape
    out = np.zeros_like(mask)
    q = deque()
    for y, x in seeds:
        if mask[y, x] and not out[y, x]:
            out[y, x] = 1
            q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not out[ny, nx]:
                out[ny, nx] = 1
                q.append((ny, nx))
    return out


def cut(img):
    """RGBA of the figure alone: the light background flooded from the edges is see-through,
    and only the biggest piece left is kept (the figure, not the watermark)."""
    a = np.array(img.convert("RGB")).astype(np.int16)
    lum, sat = a.mean(2), a.max(2) - a.min(2)
    light = (lum > 215) & (sat < 22)
    h, w = light.shape
    seeds = [(y, x) for y in range(h) for x in (0, w - 1)] + [
        (y, x) for x in range(w) for y in (0, h - 1)
    ]
    fg = ~flood(light, seeds)
    # the biggest connected piece: grow from the middle of the figure's bounding box
    ys, xs = np.where(fg)
    best = None
    seen = np.zeros_like(fg)
    for y, x in zip(ys[:: max(1, len(ys) // 400)], xs[:: max(1, len(xs) // 400)]):
        if seen[y, x]:
            continue
        c = flood(fg & ~seen, [(y, x)])
        seen |= c
        if best is None or c.sum() > best.sum():
            best = c
    return np.dstack([a.astype(np.uint8), np.where(best, 255, 0).astype(np.uint8)])


def height(rgba):
    ys = np.where(rgba[..., 3].any(1))[0]
    return ys.max() + 1 - ys.min()


def scaled(rgba, s):
    """Scaled down (premultiplied, so no light rim), then the see-through edge recoloured."""
    a = rgba.astype(np.float32)
    pre = np.dstack([a[..., :3] * a[..., 3:] / 255, a[..., 3]]).astype(np.uint8)
    im = Image.fromarray(pre, "RGBA")
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    b = np.array(im).astype(np.float32)
    al = b[..., 3:4] / 255
    b[..., :3] = np.where(al > 0, b[..., :3] / np.maximum(al, 1e-6), 0)
    b[..., 3] = np.where(b[..., 3] < 8, 0, b[..., 3])
    return defringe(b.clip(0, 255).astype(np.uint8))


def video_frames(path):
    tmp = tempfile.mkdtemp()
    subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), f"{tmp}/f%03d.png"], check=True)
    return lambda i: Image.open(f"{tmp}/f{i:03d}.png")


def main():
    frames = {}
    # standing: one picture, its own scale
    st = cut(Image.open(SRC / "standing.png"))
    frames["idle"] = [scaled(st, TALL / height(st))]
    # the strike video: one scale for every frame (from the first, where she stands)
    vid = video_frames(SRC / "strike_1.mp4")
    s = TALL / height(cut(vid(1)))
    for row, picks in PICKS.items():
        frames[row] = [scaled(cut(vid(i)), s) for i in picks]
    # crop each to the figure; rows of frames with their boots on the row's bottom line
    rows = []
    for name in ROWS:
        cropped = []
        for f in frames[name]:
            ys, xs = np.where(f[..., 3] > 10)
            cropped.append(f[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1])
        rows.append(cropped)
    W = 16 + max(sum(f.shape[1] + 24 for f in r) for r in rows)
    H = 16 + sum(max(f.shape[0] for f in r) + 16 for r in rows)
    sheet = Image.new("RGBA", (W, H))
    y = 16
    for r in rows:
        rh = max(f.shape[0] for f in r)
        x = 16
        for f in r:
            sheet.alpha_composite(Image.fromarray(f, "RGBA"), (x, y + rh - f.shape[0]))
            x += f.shape[1] + 24
        y += rh + 16
    sheet.save(ROOT / "assets/source/lucy_sheet.png", optimize=True)
    print("lucy_sheet.png", sheet.size, {n: len(frames[n]) for n in ROWS})


if __name__ == "__main__":
    main()
