#!/usr/bin/env python3
"""Generate per-article og:image cards (1200x630) with Pillow.
Arabic shaping via Pillow libraqm (direction=rtl). Run from repo root:
    python3 scripts/build_og_images.py

Template identity comes from scripts/brand.py (idea #39).
"""
import glob
import html as htmlmod
import os
import re
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from brand import (BG_TOP, BG_BOT, GOLD, TEXT, SUB, RTL,  # noqa: F401
                   font, gradient, bottom_bar, brand_row, wrap)

W, H = 1200, 630


def card(title, out_path):
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    gradient(img)
    bottom_bar(d, W, H)

    font_title = font(64)
    font_sub = font(30)

    # brand row (top-left): logo + name
    brand_row(img, d, x=64, y=48, logo_px=64, name_size=34)

    # title, right-aligned, wrapped
    lines = wrap(d, title, font_title, W - 160)
    y = 200 if len(lines) > 1 else 240
    for line in lines:
        w_ = d.textlength(line, font=font_title, **RTL)
        d.text((W - 72 - w_, y), line, font=font_title, fill=TEXT, **RTL)
        y += 88

    sub = "مقال من إيدج · نتائج وأخبار الكورة"
    d.text((W - 72 - d.textlength(sub, font=font_sub, **RTL), y + 24), sub, font=font_sub, fill=SUB, **RTL)
    img.save(out_path, "JPEG", quality=85)
    print("wrote", out_path)


def main():
    os.makedirs("articles", exist_ok=True)
    for path in sorted(glob.glob("articles/*.html")):
        c = open(path, encoding="utf-8").read()
        m = re.search(r'<meta property="og:title" content="([^"]+)"', c)
        if not m:
            continue
        slug = os.path.basename(path).replace(".html", "")
        card(htmlmod.unescape(m.group(1)), f"articles/og-{slug}.jpg")


if __name__ == "__main__":
    main()
