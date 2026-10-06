#!/usr/bin/env python3
"""Makes Lucy's sprite sheet, assets/source/lucy_sheet.png, from her pictures and videos.

    python3 tools/lucy_sheet.py      # then: npm run atlas

The sources are in assets/source/lucy/: standing.png (one frame), shoot.png (four panels:
side on, drawing the pistol, aiming, firing), hit1.png (two: taking a hit), death.png
(four: knocked down) and the videos idle.mp4,
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
ROWS = ["stand", "idle", "walk", "run", "punch1", "punch2", "throw", "hurt", "ko"]
# the pistol shot (the game's "throw" slot, K): the four panels of shoot.png, left to right
PANELS = [(0, 347), (353, 767), (772, 1205), (1210, 1680)]
# rows whose frames come from separate pictures: each frame its own window and anchor
APART = {"stand", "throw", "hurt", "ko"}
# taking a hit: the two figures of hit1.png (flinching, thrown back); falling: the four of
# death.png (thrown, diving, landing on her hands, lying) as the game's six knockdown frames
# (thrown, rising, falling, landing, bouncing, lying). Boxes are (x0, y0, x1, y1).
HIT = [(0, 0, 425, 871), (426, 0, 833, 871)]
DEATH = [(0, 0, 460, 465), (460, 0, 976, 465), (0, 465, 470, 868), (470, 465, 976, 868)]
KO = [0, 0, 1, 2, 2, 3]
# These pictures are drawn at other sizes than standing.png: how much bigger she is drawn in
# standing.png, matched by eye (her head beside her head in standing.png)
HIT_SIZE, DEATH_SIZE = 1.43, 2.1


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


def mend_tail(f, tpl, pad):
    """Puts back the tip of the tail where the picture's left edge cut it off: the tip of `tpl`
    (the same drawing, its tail whole), as many columns of it as it takes to be as tall as the
    cut, stretched to the cut. Both have `pad` empty columns added on the left."""
    a, t = f[..., 3] > 128, tpl[..., 3] > 128
    h = f.shape[0]
    low = slice(h // 3, h)  # the tail hangs in the lower two thirds

    def span(m, x):
        r = np.where(m[low, x])[0] + h // 3
        return (r.min(), r.max()) if len(r) else None

    cut = span(a, pad)
    if not cut or cut[1] - cut[0] < 6:
        return f
    tip = np.where(t[low].any(0))[0].min()
    ca, cb = cut
    n = next((k for k in range(1, pad) if (s := span(t, tip + k)) and s[1] - s[0] >= cb - ca), pad - 1)
    ta, tb = span(t, tip + n)
    out = f.copy()
    for j in range(n):
        for yd in range(max(0, ca - 60), min(h, cb + 61)):
            y = int(round(ta + (yd - ca) * (tb - ta) / max(1, cb - ca)))
            if 0 <= y < h and tpl[y, tip + j, 3] > 0:
                out[yd, pad - n + j] = tpl[y, tip + j]
    return out


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
    # the shot: four panels of one drawing, one scale (from the first, where she stands upright);
    # the panels' left edges cut the tail off in the last two, so its tip is put back
    sheet_img = Image.open(SRC / "shoot.png").convert("RGB")
    pad = 160
    panels = []
    for x0, x1 in PANELS:
        p = cut(sheet_img.crop((x0, 0, x1, sheet_img.height)))
        panels.append(np.pad(p, ((0, 0), (pad, 0), (0, 0))))
    panels = [panels[0]] + [mend_tail(p, panels[0], pad) for p in panels[1:]]
    sp = TALL / height(panels[0])
    rows["throw"] = [scaled(p, sp) for p in panels]
    # taking a hit and falling: scaled as standing.png
    s_st = TALL / height(st)
    hit = Image.open(SRC / "hit1.png").convert("RGB")
    rows["hurt"] = [scaled(cut(hit.crop(b)), s_st * HIT_SIZE) for b in HIT]
    death = Image.open(SRC / "death.png").convert("RGB")
    falls = [scaled(cut(death.crop(b)), s_st * DEATH_SIZE) for b in DEATH]
    rows["ko"] = [falls[k] for k in KO]
    # every animation: one window round all its frames, its anchor the boots' average middle
    sheet_rows, table = [], {}
    for name in ROWS:
        fr = rows[name]
        if name in APART:
            # separate pictures: each cropped to itself, anchored by its own boots
            cs, axs = [], []
            for f in fr:
                ys, xs = np.where(f[..., 3] > 10)
                cs.append(f[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1])
                # off her feet the anchor is the middle of the figure, so she does not jump
                mid = xs.mean() if name == "ko" else boots_x(f)
                axs.append(mid - xs.min())
            sheet_rows.append((name, cs, axs))
            continue
        al = np.stack([f[..., 3] > 10 for f in fr]).any(0)
        ys, xs = np.where(al)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        ax = float(np.mean([boots_x(f) for f in fr])) - x0
        sheet_rows.append((name, [f[y0:y1, x0:x1] for f in fr], [ax] * len(fr)))
    W = 16 + max(sum(f.shape[1] + 16 for f in r) for _, r, _ in sheet_rows)
    H = 16 + sum(max(f.shape[0] for f in r) + 16 for _, r, _ in sheet_rows)
    sheet = Image.new("RGBA", (W, H))
    y = 16
    for name, r, axs in sheet_rows:
        x = 16
        h = max(f.shape[0] for f in r)
        table[name] = []
        for f, ax in zip(r, axs):
            # boots on the row's bottom line
            sheet.alpha_composite(Image.fromarray(f, "RGBA"), (x, y + h - f.shape[0]))
            table[name].append([x, y, x + f.shape[1], y + h, round(float(ax), 1), h])
            x += f.shape[1] + 16
        y += h + 16
    sheet.save(ROOT / "assets/source/lucy_sheet.png", optimize=True)
    (ROOT / "assets/source/lucy_sheet.json").write_text(
        json.dumps({"rows": ROWS, "frames": table}, indent=1) + "\n"
    )
    print("lucy_sheet.png", sheet.size, {n: len(rows[n]) for n in ROWS})


if __name__ == "__main__":
    main()
