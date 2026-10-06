#!/usr/bin/env python3
"""Makes Lucy's sprite sheet, assets/source/lucy_sheet.png, from her pictures and videos.

    python3 tools/lucy_sheet.py      # then: npm run atlas

The sources are in assets/source/lucy/: standing.png (one frame) and the videos idle.mp4,
walk.mp4, run.mp4 and strike_1.mp4 (she raises her guard and jabs again and again); each
video is shot from a fixed camera with her in place. Every picture is cut out of its white
background (from the edges inwards, keeping only the figure, so the watermark goes too) and
scaled so that she is as tall as Raithwyn (356 sheet px, ears to boots; one scale for all the
videos). The frames of one animation are all cut with the same window, so they stay lined up
as in the video; the window's bottom is the ground and its anchor the middle of her boots.
The frames and their anchors go to assets/source/lucy_sheet.json for the atlas builder.
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
# The animations: video, the video frames used (from 1). Loops are spread evenly over a loop
# of the video; the jabs are picked by hand: guard, the fist going out, out, back, guard.
def loop(a, b, n):
    return [a + round(k * (b - a) / n) for k in range(n)]


ANIMS = {
    "idle": ("idle.mp4", loop(58, 120, 11)),  # 62 frames, 2.6 s
    "walk": ("walk.mp4", loop(27, 51, 8)),  # 24 frames, 1 s
    "run": ("run.mp4", loop(77, 101, 8)),  # 24 frames, 1 s
    "punch1": ("strike_1.mp4", [34, 36, 38, 40, 43]),
    "punch2": ("strike_1.mp4", [58, 60, 62, 64, 67]),
}
ROWS = ["stand", "idle", "walk", "run", "punch1", "punch2"]


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
    bg = flood(light, seeds)
    # pieces of background shut in by the figure (between the legs, inside the tail's curve):
    # as bright and even as the background, unlike the white of her tail's tip
    seen = bg.copy()
    for y, x in zip(*np.where(light & ~bg)):
        if seen[y, x]:
            continue
        c = flood(light & ~seen, [(y, x)])
        seen |= c
        if lum[c].mean() > 232 and lum[c].std() < 9 and sat[c].mean() < 10:
            bg |= c
    fg = ~bg
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


def boots_x(f):
    """The middle of her boots: the lowest tenth of the figure."""
    ys = np.where(f[..., 3].any(1))[0]
    lo = ys.max() + 1
    xs = np.where(f[lo - max(4, (lo - ys.min()) // 10) : lo, :, 3] > 128)[1]
    return (xs.min() + xs.max()) / 2


def main():
    import json

    rows = {}
    # standing: one picture, its own scale, anchored by its boots
    st = cut(Image.open(SRC / "standing.png"))
    rows["stand"] = [scaled(st, TALL / height(st))]
    # the videos: one scale for all, from her height standing at the start of the idle video
    videos = {}
    vid = lambda name: videos.setdefault(name, video_frames(SRC / name))  # noqa: E731
    s = TALL / height(cut(vid("idle.mp4")(1)))
    for name, (video, picks) in ANIMS.items():
        rows[name] = [scaled(cut(vid(video)(i)), s) for i in picks]
    # every animation: one window round all its frames, its anchor the boots' average middle
    sheet_rows, table = [], {}
    for name in ROWS:
        fr = rows[name]
        al = np.stack([f[..., 3] > 10 for f in fr]).any(0)
        ys, xs = np.where(al)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        ax = float(np.mean([boots_x(f) for f in fr])) - x0
        sheet_rows.append((name, [f[y0:y1, x0:x1] for f in fr], ax))
    W = 16 + max(sum(f.shape[1] + 16 for f in r) for _, r, _ in sheet_rows)
    H = 16 + sum(r[0].shape[0] + 16 for _, r, _ in sheet_rows)
    sheet = Image.new("RGBA", (W, H))
    y = 16
    for name, r, ax in sheet_rows:
        x = 16
        h = r[0].shape[0]
        table[name] = []
        for f in r:
            sheet.alpha_composite(Image.fromarray(f, "RGBA"), (x, y))
            table[name].append([x, y, x + f.shape[1], y + h, round(ax, 1), h])
            x += f.shape[1] + 16
        y += h + 16
    sheet.save(ROOT / "assets/source/lucy_sheet.png", optimize=True)
    (ROOT / "assets/source/lucy_sheet.json").write_text(
        json.dumps({"rows": ROWS, "frames": table}, indent=1) + "\n"
    )
    print("lucy_sheet.png", sheet.size, {n: len(rows[n]) for n in ROWS})


if __name__ == "__main__":
    main()
