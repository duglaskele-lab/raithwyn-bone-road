#!/usr/bin/env python3
"""Scales the character portraits in assets/source/portraits down for the game.

Writes assets/portraits/<name>.webp at 320x320. Run it after adding or changing a portrait:

    pip install pillow
    npm run portraits
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SIZE = 320


def main():
    out = ROOT / "assets/portraits"
    out.mkdir(exist_ok=True)
    for src in sorted((ROOT / "assets/source/portraits").glob("*.webp")):
        im = Image.open(src).convert("RGB").resize((SIZE, SIZE), Image.LANCZOS)
        im.save(out / src.name, quality=86, method=6)
        print(src.name)


if __name__ == "__main__":
    main()
