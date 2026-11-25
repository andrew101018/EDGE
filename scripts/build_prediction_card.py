#!/usr/bin/env python3
"""EDGE prediction card template (1080x1350 story), idea #39.

One card per recorded prediction, from a small JSON spec:
    python3 scripts/build_prediction_card.py spec.json out.jpg

spec.json:
{
  "comp": "دوري أبطال أوروبا",
  "home": "أرسنال",
  "away": "بوروسيا دورتموند",
  "pick": {"hs": 2, "as": 1},
  "status": "pending | correct | wrong",
  "result": {"hs": 1, "as": 1}        // optional, for resolved cards
}

Identity comes from scripts/brand.py. Scores render LTR digits.
"""
import json
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from brand import (GOLD, TEXT, SUB, GREEN, RED, RTL,
                   font, gradient, bottom_bar, brand_row, wrap)

W, H = 1080, 1350

STATUS = {
    "pending": ("قبل الماتش", GOLD),
    "correct": ("التوقع طلع صح", GREEN),
    "wrong": ("التوقع طلع غلط", RED),
}


def rtext(d, xy, text, fnt, fill, **kw):
    """Right-aligned RTL text: x is the right edge."""
    w_ = d.textlength(text, font=fnt, **RTL)
    d.text((xy[0] - w_, xy[1]), text, font=fnt, fill=fill, **RTL, **kw)


def main():
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    out = sys.argv[2]
    status = spec.get("status", "pending")
    if status not in STATUS:
        raise SystemExit(f"status must be one of {sorted(STATUS)}")

    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    gradient(img)
    bottom_bar(d, W, H)
    brand_row(img, d, x=64, y=52, logo_px=72, name_size=40)

    f_comp = font(34)
    f_badge = font(64)
    f_match = font(56)
    f_score = font(90)
    f_small = font(34)
    f_chip = font(40)

    right = W - 80
    y = 190
    if spec.get("comp"):
        rtext(d, (right, y), spec["comp"], f_comp, SUB)
        y += 60
    rtext(d, (right, y), "توقع إيدج", f_badge, GOLD)
    y += 110

    match = f'{spec["home"]} × {spec["away"]}'
    for line in wrap(d, match, f_match, W - 160, max_lines=2):
        rtext(d, (right, y), line, f_match, TEXT)
        y += 76
    y += 40

    # pick box: each team name sits directly under its own number
    pick = spec["pick"]
    box = [120, y, W - 120, y + 300]
    d.rounded_rectangle(box, radius=26, outline=GOLD, width=5)
    rtext(d, (W - 160, y + 36), "التوقع", f_small, SUB)
    hs_s, as_s = str(pick["hs"]), str(pick["as"])
    # wide fixed columns: each digit and its team name share one column center
    hs_cx, as_cx = 120 + (W - 240) * 0.28, 120 + (W - 240) * 0.72
    dash = "-"
    dd_w = d.textlength(dash, font=f_score)
    d.text(((W - dd_w) / 2, y + 100), dash, font=f_score, fill=SUB)
    for digit, cx in ((hs_s, hs_cx), (as_s, as_cx)):
        dw = d.textlength(digit, font=f_score)
        d.text((cx - dw / 2, y + 100), digit, font=f_score, fill=TEXT)  # LTR digits
    for name, cx in ((spec["home"], hs_cx), (spec["away"], as_cx)):
        nw = d.textlength(name, font=f_small, **RTL)
        d.text((cx - nw / 2, y + 225), name, font=f_small, fill=SUB, **RTL)
    y += 300 + 60

    # status chip
    label, color = STATUS[status]
    lw = d.textlength(label, font=f_chip, **RTL)
    pad = 36
    d.rounded_rectangle([W - 80 - lw - pad * 2, y, W - 80, y + 84], radius=42, fill=color)
    rtext(d, (W - 80 - pad, y + 18), label, f_chip, (11, 18, 32))
    y += 84 + 30

    res = spec.get("result")
    if status != "pending" and res:
        # named score: each digit drawn right after its own team name (RTL order)
        rtext(d, (right, y), "النتيجة النهائية:", f_small, TEXT)
        y += 50
        x = right
        for name, goals in ((spec["home"], res["hs"]), ("-", None), (spec["away"], res["as"])):
            if name == "-":
                sep = "-"
                x -= d.textlength(sep, font=f_small) + 18
                d.text((x, y), sep, font=f_small, fill=SUB)
                x -= 18
                continue
            nw = d.textlength(name, font=f_small, **RTL)
            x -= nw
            d.text((x, y), name, font=f_small, fill=TEXT, **RTL)
            g = str(goals)  # LTR digit glued to its own team name
            x -= d.textlength(g, font=f_small) + 10
            d.text((x, y), g, font=f_small, fill=GOLD)
            x -= 22
        y += 56

    if spec.get("note"):
        for line in wrap(d, spec["note"], f_small, W - 160, max_lines=2):
            rtext(d, (right, y + 10), line, f_small, SUB)
            y += 48

    img.save(out, "JPEG", quality=88)
    print("wrote", out)


if __name__ == "__main__":
    main()
