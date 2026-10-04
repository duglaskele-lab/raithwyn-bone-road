#!/usr/bin/env python3
"""Cuts assets/source/character_sheet.png into frames and packs them into the game atlas.

Writes assets/atlas.png and src/atlas-frames.js. Run it after editing the sprite sheet:

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
SHEET = ROOT / "assets/source/character_sheet.png"
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
    _, x0, y0, x1, y1, ax, ay = item
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


def main():
    im = Image.open(SHEET).convert("RGBA")
    opaque = np.array(im)[..., 3] > 10
    rows = runs(opaque.any(1))
    if len(rows) != len(ROW_NAMES):
        raise SystemExit(f"expected {len(ROW_NAMES)} rows in the sheet, found {len(rows)}")

    items = []
    for name, (y0, y1) in zip(ROW_NAMES, rows):
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
            items.append([name, x0, y0, x1, y1, ax, ay])

    jumps = [it for it in items if it[0] == "jump"]
    for i, lift in JUMP_LIFT.items():
        jumps[i][6] += lift / SCALE
    idle = next(it for it in items if it[0] == "idle")
    for it in items:
        if it[0] in BODY_ALIGNED:
            it[5] -= body_shift(opaque, idle, it)
    items = [tuple(it) for it in items]

    x = y = row_h = 0
    places = []
    for _, x0, y0, x1, y1, _, _ in items:
        w = int(np.ceil((x1 - x0) * SCALE)) + 2
        h = int(np.ceil((y1 - y0) * SCALE)) + 2
        if x + w > ATLAS_WIDTH:
            x, y, row_h = 0, y + row_h, 0
        places.append((x, y, w, h))
        x += w
        row_h = max(row_h, h)

    atlas = Image.new("RGBA", (ATLAS_WIDTH, y + row_h), (0, 0, 0, 0))
    frames = {}
    for (name, x0, y0, x1, y1, ax, ay), (px, py, w, h) in zip(items, places):
        crop = im.crop((x0, y0, x1, y1)).convert("RGBa").resize((w - 2, h - 2), Image.BOX)
        atlas.paste(crop.convert("RGBA"), (px + 1, py + 1))
        frames.setdefault(name, []).append(
            [px + 1, py + 1, w - 2, h - 2, round(float(ax) * SCALE, 1), round(float(ay) * SCALE, 1)])

    atlas.quantize(colors=256, method=2, dither=0).save(ROOT / "assets/atlas.png", optimize=True)
    (ROOT / "src/atlas-frames.js").write_text(
        "// Generated by tools/build_atlas.py. Do not edit by hand.\n"
        "// Each frame is [x, y, w, h, anchorX, anchorY] inside assets/atlas.png.\n"
        "export const FR=" + json.dumps(frames, separators=(",", ":")) + ";\n")
    print(f"atlas {atlas.size[0]}x{atlas.size[1]}, {len(items)} frames")


if __name__ == "__main__":
    main()
