#!/usr/bin/env python3
"""Takes the light fringe off the edge of frames cut out of a light background.

An edge pixel that is partly see-through still carries the background's light colour mixed
in, which shows as a thin pale outline on the dark game backdrop. Each such pixel gets the
colour of the solid pixels next to it instead; how see-through it is stays as it was.

    python3 tools/defringe.py [Y0 Y1]   # rows of assets/source/raithwyn_sheet.png (16 372: idle)
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOLID = 250   # alpha from which a pixel counts as solid


def defringe(rgba, steps=4):
    """RGBA array (h, w, 4) -> the same with the see-through edge recoloured from inside."""
    out = rgba.astype(np.float32)
    known = out[..., 3] >= SOLID
    rgb = np.where(known[..., None], out[..., :3], 0)
    for _ in range(steps):   # grow the solid colours outwards a pixel at a time
        acc = np.zeros_like(rgb)
        n = np.zeros(known.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            k = np.roll(known, (dy, dx), (0, 1))
            acc += np.roll(rgb, (dy, dx), (0, 1)) * k[..., None]
            n += k
        new = ~known & (n > 0)
        rgb[new] = acc[new] / n[new][:, None]
        known |= new
    edge = (out[..., 3] > 0) & (out[..., 3] < SOLID) & known
    out[..., :3][edge] = rgb[edge]
    return out.clip(0, 255).astype(np.uint8)


if __name__ == "__main__":
    y0, y1 = (int(v) for v in sys.argv[1:3]) if len(sys.argv) > 2 else (16, 372)
    path = ROOT / "assets/source/raithwyn_sheet.png"
    sheet = np.array(Image.open(path).convert("RGBA"))
    sheet[y0:y1] = defringe(sheet[y0:y1])
    Image.fromarray(sheet, "RGBA").save(path, optimize=True)
