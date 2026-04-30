#!/usr/bin/env python3
"""Render the LinkedOut Play Store feature graphic (1024x500) from the icon source.

Layout:
  | left 40%: gradient extension of the icon source (cropped + blurred)
  | right 60%: the wordmark + tagline on a dark navy background
"""
from __future__ import annotations
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1024, 500
SRC = Path("/app/output/play-store/icon-1024-source.png")
OUT_PATHS = [
    Path("/app/output/play-store/feature-graphic-1024x500.png"),
]
NAVY = (5, 5, 16, 255)
CORAL = (252, 128, 25, 255)
GOLD = (229, 192, 123, 255)
WHITE = (240, 240, 246, 255)
DIM = (148, 163, 184, 255)


def _font(weight: str, size: int) -> ImageFont.ImageFont:
    candidates = {
        "black": [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
        ],
        "bold": [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ],
        "regular": [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ],
        "mono": [
            "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        ],
    }
    for path in candidates[weight]:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def main() -> int:
    if not SRC.exists():
        print(f"Source missing: {SRC} — run scripts/gen_logo.py first.", file=sys.stderr)
        return 2

    canvas = Image.new("RGBA", (W, H), NAVY)
    draw = ImageDraw.Draw(canvas)

    # Soft radial coral glow upper right
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((W - 380, -180, W + 220, 380), fill=(*CORAL[:3], 70))
    glow = glow.filter(ImageFilter.GaussianBlur(80))
    canvas = Image.alpha_composite(canvas, glow)

    # Soft gold glow lower left
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((-260, H - 220, 320, H + 220), fill=(*GOLD[:3], 50))
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    canvas = Image.alpha_composite(canvas, glow)

    # Left: icon thumbnail with rounded corners
    icon_size = 360
    icon = Image.open(SRC).convert("RGBA").resize((icon_size, icon_size), Image.LANCZOS)
    rr_mask = Image.new("L", (icon_size, icon_size), 0)
    ImageDraw.Draw(rr_mask).rounded_rectangle(
        (0, 0, icon_size, icon_size), radius=int(icon_size * 0.22), fill=255
    )
    icon.putalpha(rr_mask)
    icon_x, icon_y = 70, (H - icon_size) // 2
    canvas.paste(icon, (icon_x, icon_y), icon)

    # Right: tagline + meta
    draw = ImageDraw.Draw(canvas)
    text_x = icon_x + icon_size + 60

    # Tagline line 1
    f_tag = _font("black", 64)
    draw.text((text_x, 130), "The grind.", font=f_tag, fill=WHITE)
    draw.text((text_x, 200), "Gamified.", font=f_tag, fill=WHITE)
    draw.text((text_x, 270), "Quietly.", font=f_tag, fill=CORAL)

    # Sub
    f_sub = _font("regular", 22)
    draw.text((text_x, 360), "Corporate Ladder Simulator", font=f_sub, fill=GOLD)

    # Meta strip
    f_meta = _font("mono", 18)
    draw.text((text_x, 395), "Climb · Survive · Terminate", font=f_meta, fill=DIM)

    # Save
    canvas = canvas.convert("RGB")
    for p in OUT_PATHS:
        p.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(p, format="PNG", optimize=True)
        print(f"==> Saved feature graphic: {p}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
