#!/usr/bin/env python3
"""Generate per-article og:image cards (1200x630) with Pillow.
Arabic shaping via Pillow libraqm (direction=rtl). Run from repo root:
    python3 scripts/build_og_images.py
"""
import glob
import html as htmlmod
import os
import re

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG_TOP = (11, 18, 32)
BG_BOT = (22, 33, 58)
GOLD = (251, 191, 36)
TEXT = (241, 245, 249)
SUB = (148, 163, 184)
BAR = (245, 158, 11)

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_PATH = os.path.join(HERE, "assets", "Cairo.ttf")
LOGO_PATH = "photo_2024-09-05_19-57-28.jpg"


RTL = {"direction": "rtl", "language": "ar"}


def rtl(text):
    return text  # raqm shapes/bidi at draw time


def wrap(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for w_ in words:
        trial = (cur + " " + w_).strip()
        if draw.textlength(rtl(trial), font=font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w_
    if cur:
        lines.append(cur)
    return lines[:3]


def card(title, out_path):
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        img.paste(tuple(int(BG_TOP[i] + (BG_BOT[i] - BG_TOP[i]) * t) for i in range(3)), (0, y, W, y + 1))
    d.rectangle([0, H - 10, W, H], fill=BAR)

    font_title = ImageFont.truetype(FONT_PATH, 64)
    font_sub = ImageFont.truetype(FONT_PATH, 30)
    font_brand = ImageFont.truetype(FONT_PATH, 34)

    # brand row (top-left): logo + name
    x = 64
    if os.path.exists(LOGO_PATH):
        logo = Image.open(LOGO_PATH).convert("RGB").resize((64, 64))
        mask = Image.new("L", (64, 64), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, 64, 64], fill=255)
        img.paste(logo, (x, 48), mask)
    d.text((x + 80, 58), "Edge Football", font=font_brand, fill=GOLD)

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
