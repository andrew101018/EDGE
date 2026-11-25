#!/usr/bin/env python3
"""EDGE unified visual identity for generated images (idea #39).

Single source of truth for every image template the site produces:
palette, fonts, logo, gradient background, brand row and the gold bar.
Template scripts import from here so every card type stays on-identity.

Canonical palette:
  dark top #0b1220 / dark bottom #16213a (gradient background)
  gold #fbbf24 (brand + headings) / amber #f59e0b (bottom bar)
  text #f1f5f9 / muted #94a3b8
"""
import os

from PIL import Image, ImageDraw, ImageFont

BG_TOP = (11, 18, 32)
BG_BOT = (22, 33, 58)
GOLD = (251, 191, 36)
TEXT = (241, 245, 249)
SUB = (148, 163, 184)
BAR = (245, 158, 11)
GREEN = (22, 163, 74)
RED = (220, 38, 38)

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_PATH = os.path.join(HERE, "assets", "Cairo.ttf")
LOGO_PATH = "photo_2024-09-05_19-57-28.jpg"
BRAND_NAME = "Edge Football"

# Pillow + libraqm shapes Arabic at draw time; pass these kwargs on RTL text.
RTL = {"direction": "rtl", "language": "ar"}


def font(size):
    return ImageFont.truetype(FONT_PATH, size)


def gradient(img):
    """Fill the whole image with the vertical brand gradient."""
    w, h = img.size
    for y in range(h):
        t = y / h
        img.paste(tuple(int(BG_TOP[i] + (BG_BOT[i] - BG_TOP[i]) * t) for i in range(3)), (0, y, w, y + 1))


def bottom_bar(d, w, h, thickness=10):
    d.rectangle([0, h - thickness, w, h], fill=BAR)


def brand_row(img, d, x=64, y=48, logo_px=64, name_size=34):
    """Logo disc + brand name in gold, top-left. Same row on every card."""
    if os.path.exists(LOGO_PATH):
        logo = Image.open(LOGO_PATH).convert("RGB").resize((logo_px, logo_px))
        mask = Image.new("L", (logo_px, logo_px), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, logo_px, logo_px], fill=255)
        img.paste(logo, (x, y), mask)
    d.text((x + logo_px + 16, y + 10), BRAND_NAME, font=font(name_size), fill=GOLD)


def wrap(draw, text, fnt, max_w, max_lines=3):
    """Word-wrap for Arabic text; measuring is direction-agnostic."""
    words, lines, cur = text.split(), [], ""
    for w_ in words:
        trial = (cur + " " + w_).strip()
        if draw.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w_
    if cur:
        lines.append(cur)
    return lines[:max_lines]
