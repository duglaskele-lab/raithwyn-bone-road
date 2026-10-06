#!/usr/bin/env python3
"""Cuts each fighter's sprite sheet into frames and packs them into that fighter's atlas.

Raithwyn: assets/source/raithwyn_sheet.png -> assets/atlas.png, src/atlas-frames.js.
Lucy: assets/source/lucy_sheet.png -> assets/lucy.png, src/lucy-frames.js (see FIGHTERS).
Run it after editing a sprite sheet:

    pip install pillow numpy
    npm run atlas

The sheet is expected to keep its layout: one animation per row, frames separated by
fully transparent columns, rows separated by fully transparent lines. Rows are named
top to bottom by ROW_NAMES below.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SHEET = ROOT / "assets/source/raithwyn_sheet.png"
ROW_NAMES = ["idle", "jump", "run", "walk", "hurt", "laugh", "punch1", "punch2",
             "hado", "fx", "orb", "ko", "throw", "back"]
SCALE = 0.5          # the sheet is drawn at twice the in-game size
ATLAS_WIDTH = 1180
HEAD_ANCHORED = {"jump", "run", "walk"}   # feet leave the ground, so anchor by the head
CENTER_ANCHORED = {"fx"}                  # projectiles are anchored by their centre
# Punches: the feet step around between frames, so anchoring by the feet makes the body
# jump forward and back, and snap back again when the idle pose returns. These rows are
# shifted so that the torso and hips line up with the idle pose; the forward step comes
# from the game moving the player instead.
BODY_ALIGNED = {"punch1", "punch2"}
BODY_BAND = (45, 130)   # rows of the body used for the match, in game px above the ground
# Jump: the frames sit on the bottom of the row, so the apex frame (2), with its legs tucked
# up, would drop the head below the frames around it. It is lifted by this many game px.
JUMP_LIFT = {2: 28}


def runs(mask):
    """Start/end pairs of consecutive True values."""
    out, start = [], None
    for i, v in enumerate(mask):
        if v and start is None:
            start = i
        if not v and start is not None:
            out.append([start, i])
            start = None
    if start is not None:
        out.append([start, len(mask)])
    return out


def placed(opaque, item, width=1200, height=520):
    """The frame's mask on a canvas with its anchor at the bottom centre."""
    _, x0, y0, x1, y1, ax, ay, _ = item
    canvas = np.zeros((height, width), bool)
    left, top = width // 2 - int(round(ax)), height - int(round(ay))
    canvas[top:top + y1 - y0, left:left + x1 - x0] = opaque[y0:y1, x0:x1]
    return canvas


def body_shift(opaque, idle, item):
    """Horizontal shift (sheet px) that best overlaps the frame's body with the idle pose."""
    lo, hi = (int(v / SCALE) for v in BODY_BAND)
    ref, frame = placed(opaque, idle), placed(opaque, item)
    band = slice(ref.shape[0] - hi, ref.shape[0] - lo)
    ref, frame = ref[band], frame[band]

    def overlap(dx):
        moved = np.roll(frame, dx, axis=1)
        return (moved & ref).sum() / max(1, (moved | ref).sum())

    return max(range(-120, 121), key=overlap)


def cut(opaque, name, y0, y1, src):
    """The frames of one row: [name, x0, y0, x1, y1, anchorX, anchorY, source image]."""
    items = []
    cols = []
    for c in runs(opaque[y0:y1].any(0)):
        if cols and c[0] - cols[-1][1] < 6:   # glue stray pixels to the previous frame
            cols[-1][1] = c[1]
        else:
            cols.append(c)
    for x0, x1 in cols:
        sub = opaque[y0:y1, x0:x1]
        ys = np.where(sub.any(1))[0]
        top, bottom = ys[0], ys[-1] + 1
        if name in CENTER_ANCHORED:
            ax, ay = (x1 - x0) / 2, (y1 - y0) / 2
        elif name in HEAD_ANCHORED:
            band = sub[top:top + int((bottom - top) * 0.22)]
            ax = np.median(np.where(band)[1]) - 18
            ay = bottom if name == "jump" else y1 - y0
        else:
            xs = np.where(sub[int((y1 - y0) * 0.9):])[1]   # feet
            ax, ay = (xs.min() + xs.max()) / 2, y1 - y0
        items.append([name, x0, y0, x1, y1, ax, ay, src])
    return items


# The fighters: sheet, its rows top to bottom, where the atlas and its frame table go, and
# Raithwyn's own fixes (the jump's lifted apex, punches lined up on the idle body).
FIGHTERS = [
    {
        "sheet": SHEET,
        "rows": ROW_NAMES,
        "atlas": "assets/atlas.png",
        "js": "src/atlas-frames.js",
        "lift": JUMP_LIFT,
        "body": BODY_ALIGNED,
    },
    {
        # Lucy's frames and anchors come with her sheet (tools/lucy_sheet.py): each animation
        # was cut with one window, so its frames keep their places from the video
        "sheet": ROOT / "assets/source/lucy_sheet.png",
        "frames": ROOT / "assets/source/lucy_sheet.json",
        "rows": None,
        "atlas": "assets/lucy.png",
        "js": "src/lucy-frames.js",
        "lift": {},
        "body": set(),
    },
]


def main():
    for f in FIGHTERS:
        build(f)


def build(F):
    im = Image.open(F["sheet"]).convert("RGBA")
    opaque = np.array(im)[..., 3] > 10
    if F.get("frames"):
        table = json.loads(F["frames"].read_text())
        items = [[name, x0, y0, x1, y1, ax, ay, im]
                 for name in table["rows"] for x0, y0, x1, y1, ax, ay in table["frames"][name]]
        return pack(F, items)
    rows = runs(opaque.any(1))
    if len(rows) != len(F["rows"]):
        raise SystemExit(f"expected {len(F['rows'])} rows in {F['sheet'].name}, found {len(rows)}")

    items = []
    for name, (y0, y1) in zip(F["rows"], rows):
        items += cut(opaque, name, y0, y1, im)

    jumps = [it for it in items if it[0] == "jump"]
    for i, lift in F["lift"].items():
        jumps[i][6] += lift / SCALE
    idle = next(it for it in items if it[0] == "idle")
    for it in items:
        if it[0] in F["body"]:
            it[5] -= body_shift(opaque, idle, it)
    pack(F, items)


def pack(F, items):
    # Every frame is halved on the same grid: the anchor on a whole sheet pixel, an even
    # number of pixels from the crop's edge, and an even crop. Otherwise frames with an odd
    # offset are resampled half a pixel apart and the figure jitters from frame to frame
    # (the idle feet did). Widening a crop by a pixel only adds empty space.
    for it in items:
        name, x0, y0, x1, y1, ax, ay, src = it
        # halves always up (round() takes them to the even side: every other frame a pixel off)
        X, Y = int(np.floor(x0 + ax + 0.5)), int(np.floor(y0 + ay + 0.5))
        x0 -= (X - x0) % 2
        y0 -= (Y - y0) % 2
        x1 += (x1 - x0) % 2
        y1 += (y1 - y0) % 2
        it[1:7] = [x0, y0, x1, y1, X - x0, Y - y0]
    items = [tuple(it) for it in items]

    x = y = row_h = 0
    places = []
    for _, x0, y0, x1, y1, _, _, _ in items:
        w = (x1 - x0) // 2 + 2
        h = (y1 - y0) // 2 + 2
        if x + w > ATLAS_WIDTH:
            x, y, row_h = 0, y + row_h, 0
        places.append((x, y, w, h))
        x += w
        row_h = max(row_h, h)

    atlas = Image.new("RGBA", (ATLAS_WIDTH, y + row_h), (0, 0, 0, 0))
    frames = {}
    for (name, x0, y0, x1, y1, ax, ay, src), (px, py, w, h) in zip(items, places):
        crop = src.crop((x0, y0, x1, y1)).convert("RGBa").resize((w - 2, h - 2), Image.BOX)
        atlas.paste(crop.convert("RGBA"), (px + 1, py + 1))
        frames.setdefault(name, []).append(
            [px + 1, py + 1, w - 2, h - 2, round(float(ax) * SCALE, 1), round(float(ay) * SCALE, 1)])

    atlas.quantize(colors=256, method=2, dither=0).save(ROOT / F["atlas"], optimize=True)
    (ROOT / F["js"]).write_text(
        "// Generated by tools/build_atlas.py. Do not edit by hand.\n"
        f"// Each frame is [x, y, w, h, anchorX, anchorY] inside {F['atlas']}.\n"
        "export const FR=" + json.dumps(frames, separators=(",", ":")) + ";\n")
    print(f"{F['atlas']} {atlas.size[0]}x{atlas.size[1]}, {len(items)} frames")


if __name__ == "__main__":
    main()
