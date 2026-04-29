#!/usr/bin/env python3
"""Generate Android launcher icons for Corporate Ladder Simulator.
Brand: dark navy (#050510) bg with cyan chart-up motif (matches in-app aesthetic).
"""
from PIL import Image, ImageDraw
import os

ANDROID_RES = "/app/android/app/src/main/res"

# (folder_suffix, legacy_size, foreground_size)
DENSITIES = [
    ("mdpi", 48, 108),
    ("hdpi", 72, 162),
    ("xhdpi", 96, 216),
    ("xxhdpi", 144, 324),
    ("xxxhdpi", 192, 432),
]

# Palette
BG = (5, 5, 16, 255)            # #050510
ACCENT = (34, 211, 238, 255)    # cyan-400
ACCENT_DIM = (8, 145, 178, 255) # cyan-600
WHITE = (226, 232, 240, 255)

# Chart layout (relative to inner area)
BAR_HEIGHTS = (0.18, 0.36, 0.55, 0.78)
ARROW_PATH = (
    (0.05, 0.18), (0.30, 0.30), (0.55, 0.50), (0.85, 0.78),
)


def _draw_background(d: ImageDraw.ImageDraw, size: int) -> None:
    d.rectangle((0, 0, size, size), fill=BG)
    bw = max(2, size // 48)
    d.rectangle((bw, bw, size - bw, size - bw), outline=ACCENT_DIM, width=bw)


def _chart_box(size: int, padding_ratio: float) -> dict:
    pad = int(size * padding_ratio)
    inner = size - 2 * pad
    return {
        "pad": pad,
        "inner": inner,
        "left": pad + int(inner * 0.10),
        "right": pad + int(inner * 0.92),
        "base": pad + int(inner * 0.78),
        "top": pad + int(inner * 0.10),
    }


def _draw_axes(d: ImageDraw.ImageDraw, size: int, box: dict) -> None:
    w = max(2, size // 64)
    d.line([(box["left"], box["top"]), (box["left"], box["base"])], fill=ACCENT_DIM, width=w)
    d.line([(box["left"], box["base"]), (box["right"], box["base"])], fill=ACCENT_DIM, width=w)


def _draw_bars(d: ImageDraw.ImageDraw, size: int, box: dict) -> None:
    gap = max(2, size // 40)
    avail = box["right"] - box["left"] - gap
    bar_w = max(2, avail // len(BAR_HEIGHTS) - gap)
    last = len(BAR_HEIGHTS) - 1
    for i, hf in enumerate(BAR_HEIGHTS):
        bx = box["left"] + gap + i * (bar_w + gap)
        bh = int(box["inner"] * hf)
        col = ACCENT if i == last else ACCENT_DIM
        d.rectangle((bx, box["base"] - bh, bx + bar_w, box["base"]), fill=col)


def _arrow_points(box: dict) -> list:
    return [
        (box["left"] + int(box["inner"] * rx), box["base"] - int(box["inner"] * ry))
        for rx, ry in ARROW_PATH
    ]


def _draw_arrow(d: ImageDraw.ImageDraw, size: int, box: dict) -> None:
    pts = _arrow_points(box)
    line_w = max(3, size // 32)
    for a, b in zip(pts, pts[1:]):
        d.line([a, b], fill=WHITE, width=line_w)
    ax, ay = pts[-1]
    h = max(6, size // 14)
    d.polygon([(ax, ay - h // 2), (ax + h, ay - h // 2 + 1), (ax + h // 2, ay - h)], fill=WHITE)
    d.polygon([(ax + h, ay - h // 2 + 1), (ax + h, ay + h // 2), (ax + h // 2, ay + 1)], fill=WHITE)


def draw_chart(img: Image.Image, size: int, padding_ratio: float = 0.18, draw_bg: bool = True) -> None:
    """Draw a stylized rising chart inside img."""
    d = ImageDraw.Draw(img)
    if draw_bg:
        _draw_background(d, size)
    box = _chart_box(size, padding_ratio)
    _draw_axes(d, size, box)
    _draw_bars(d, size, box)
    _draw_arrow(d, size, box)


def make_legacy_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), BG)
    draw_chart(img, size, padding_ratio=0.16, draw_bg=True)
    return img


def make_round_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)
    img.paste(make_legacy_icon(size), (0, 0), mask)
    return img


def make_foreground(size: int) -> Image.Image:
    """Adaptive icon foreground — transparent bg, chart fills inner safe area (~66%)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_chart(img, size, padding_ratio=0.27, draw_bg=False)
    return img


def main() -> None:
    for suffix, legacy, fg in DENSITIES:
        folder = os.path.join(ANDROID_RES, f"mipmap-{suffix}")
        os.makedirs(folder, exist_ok=True)
        make_legacy_icon(legacy).save(os.path.join(folder, "ic_launcher.png"))
        make_round_icon(legacy).save(os.path.join(folder, "ic_launcher_round.png"))
        make_foreground(fg).save(os.path.join(folder, "ic_launcher_foreground.png"))
        print(f"  wrote {suffix}: {legacy}px legacy, {fg}px foreground")

    bg_xml = os.path.join(ANDROID_RES, "values", "ic_launcher_background.xml")
    with open(bg_xml, "w") as f:
        f.write(
            "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n"
            "<resources>\n"
            "    <color name=\"ic_launcher_background\">#050510</color>\n"
            "</resources>\n"
        )
    print("Updated adaptive icon background -> #050510")


if __name__ == "__main__":
    main()
