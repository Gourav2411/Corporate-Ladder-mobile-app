#!/usr/bin/env python3
"""Generate Play Store listing assets.
- 512x512 high-res launcher icon (Play Store required)
- 1024x500 feature graphic (Play Store recommended)

Brand: dark navy (#050510) + cyan rising-chart, matches the in-app aesthetic.
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

# Reuse the chart drawing helpers from the launcher icon generator.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_android_icons import (  # noqa: E402
    draw_chart, BG, ACCENT, ACCENT_DIM, WHITE,
)

OUTDIR = "/app/output/play-store"
os.makedirs(OUTDIR, exist_ok=True)

CYAN = (34, 211, 238)
CYAN_DIM = (8, 145, 178)
INK = (226, 232, 240)
DARK = (5, 5, 16)


def _font(size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def make_high_res_icon(out_path: str, size: int = 512) -> None:
    img = Image.new("RGBA", (size, size), BG)
    draw_chart(img, size, padding_ratio=0.16, draw_bg=True)
    img.save(out_path)
    print(f"  wrote 512x512 icon -> {out_path}")


def _grid_overlay(d: ImageDraw.ImageDraw, w: int, h: int) -> None:
    grid_color = (12, 56, 70, 255)
    step = 60
    for x in range(0, w, step):
        d.line([(x, 0), (x, h)], fill=grid_color, width=1)
    for y in range(0, h, step):
        d.line([(0, y), (w, y)], fill=grid_color, width=1)


def make_feature_graphic(out_path: str) -> None:
    w, h = 1024, 500
    img = Image.new("RGBA", (w, h), DARK + (255,))
    d = ImageDraw.Draw(img)

    # subtle grid background
    _grid_overlay(d, w, h)

    # left-side big chart icon block (square)
    block = 380
    pad = 60
    bx = pad
    by = (h - block) // 2
    chart_img = Image.new("RGBA", (block, block), DARK + (255,))
    draw_chart(chart_img, block, padding_ratio=0.18, draw_bg=True)
    img.paste(chart_img, (bx, by), chart_img)

    # right-side text block
    text_x = bx + block + 60
    title = "CORPORATE LADDER"
    sub = "SIMULATOR"
    tagline = "DON'T WORK YOUR WAY TO THE TOP."
    badge = "NEW · ANDROID"

    # Title
    f_title = _font(80)
    f_sub = _font(86)
    f_tag = _font(28)
    f_badge = _font(20)

    # Cyan badge
    bb = f_badge.getbbox(badge)
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    bp_x, bp_y = text_x, 60
    d.rectangle((bp_x - 6, bp_y - 6, bp_x + bw + 18, bp_y + bh + 14), outline=CYAN, width=2)
    d.text((bp_x + 6, bp_y), badge, font=f_badge, fill=CYAN)

    # CORPORATE LADDER (white)
    d.text((text_x, 120), title, font=f_title, fill=INK)
    # SIMULATOR (cyan, slightly oversized)
    d.text((text_x, 215), sub, font=f_sub, fill=CYAN)

    # Tagline (cyan-dim)
    d.text((text_x, 330), tagline, font=f_tag, fill=CYAN_DIM)

    # Bottom accent strip
    d.rectangle((0, h - 8, w, h), fill=CYAN)
    # Top tiny strip
    d.rectangle((0, 0, w, 4), fill=CYAN_DIM)

    img.save(out_path)
    print(f"  wrote 1024x500 feature graphic -> {out_path}")


def make_promo_graphic(out_path: str) -> None:
    """Optional 180x120 small promo graphic (legacy Play store size)."""
    w, h = 180, 120
    img = Image.new("RGBA", (w, h), DARK + (255,))
    d = ImageDraw.Draw(img)
    chart_img = Image.new("RGBA", (h, h), DARK + (255,))
    draw_chart(chart_img, h, padding_ratio=0.16, draw_bg=True)
    img.paste(chart_img, (0, 0), chart_img)
    f = _font(14)
    d.text((h + 8, 24), "CORPORATE", font=f, fill=INK)
    d.text((h + 8, 42), "LADDER", font=f, fill=CYAN)
    d.text((h + 8, 64), "SIM", font=f, fill=CYAN_DIM)
    img.save(out_path)
    print(f"  wrote 180x120 promo graphic -> {out_path}")


def main() -> None:
    make_high_res_icon(os.path.join(OUTDIR, "icon-512.png"), 512)
    make_feature_graphic(os.path.join(OUTDIR, "feature-graphic-1024x500.png"))
    make_promo_graphic(os.path.join(OUTDIR, "promo-graphic-180x120.png"))


if __name__ == "__main__":
    main()
