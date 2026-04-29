#!/usr/bin/env python3
"""Generate Android launcher icons for Corporate Ladder Simulator.
Brand: dark navy (#050510) bg with cyan chart-up motif (matches in-app aesthetic).
"""
from PIL import Image, ImageDraw, ImageFont
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

BG = (5, 5, 16, 255)         # #050510
ACCENT = (34, 211, 238, 255)  # cyan-400
ACCENT_DIM = (8, 145, 178, 255)  # cyan-600
WHITE = (226, 232, 240, 255)


def draw_chart(img: Image.Image, size: int, padding_ratio: float = 0.18, draw_bg: bool = True):
    """Draw a stylized rising chart inside img."""
    d = ImageDraw.Draw(img)
    if draw_bg:
        d.rectangle((0, 0, size, size), fill=BG)
        # subtle inner border
        bw = max(2, size // 48)
        d.rectangle((bw, bw, size - bw, size - bw), outline=ACCENT_DIM, width=bw)

    pad = int(size * padding_ratio)
    inner = size - 2 * pad
    base_y = pad + int(inner * 0.78)
    left_x = pad + int(inner * 0.10)
    right_x = pad + int(inner * 0.92)

    # axis
    axis_w = max(2, size // 64)
    d.line([(left_x, pad + int(inner * 0.10)), (left_x, base_y)], fill=ACCENT_DIM, width=axis_w)
    d.line([(left_x, base_y), (right_x, base_y)], fill=ACCENT_DIM, width=axis_w)

    # rising bars
    bar_count = 4
    bar_gap = max(2, size // 40)
    avail = right_x - left_x - bar_gap
    bar_w = avail // bar_count - bar_gap
    if bar_w < 2:
        bar_w = 2
    heights = [0.18, 0.36, 0.55, 0.78]
    for i, hf in enumerate(heights):
        bx = left_x + bar_gap + i * (bar_w + bar_gap)
        bh = int(inner * hf)
        col = ACCENT if i == bar_count - 1 else ACCENT_DIM
        d.rectangle((bx, base_y - bh, bx + bar_w, base_y), fill=col)

    # arrow line going up over bars
    line_w = max(3, size // 32)
    pts = [
        (left_x + int(inner * 0.05), base_y - int(inner * 0.18)),
        (left_x + int(inner * 0.30), base_y - int(inner * 0.30)),
        (left_x + int(inner * 0.55), base_y - int(inner * 0.50)),
        (left_x + int(inner * 0.85), base_y - int(inner * 0.78)),
    ]
    for i in range(len(pts) - 1):
        d.line([pts[i], pts[i + 1]], fill=WHITE, width=line_w)

    # arrow head
    ax, ay = pts[-1]
    head = max(6, size // 14)
    d.polygon([
        (ax, ay - head // 2),
        (ax + head, ay - head // 2 + 1),
        (ax + head // 2, ay - head),
    ], fill=WHITE)
    d.polygon([
        (ax + head, ay - head // 2 + 1),
        (ax + head, ay + head // 2),
        (ax + head // 2, ay + 1),
    ], fill=WHITE)


def make_legacy_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), BG)
    draw_chart(img, size, padding_ratio=0.16, draw_bg=True)
    return img


def make_round_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse((0, 0, size, size), fill=255)
    sq = make_legacy_icon(size)
    img.paste(sq, (0, 0), mask)
    return img


def make_foreground(size: int) -> Image.Image:
    """Adaptive icon foreground — transparent bg, chart fills inner safe area (~66%)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # safe zone is ~66% of canvas; render with extra padding so it stays inside.
    draw_chart(img, size, padding_ratio=0.27, draw_bg=False)
    return img


def main():
    for suffix, legacy, fg in DENSITIES:
        folder = os.path.join(ANDROID_RES, f"mipmap-{suffix}")
        os.makedirs(folder, exist_ok=True)
        make_legacy_icon(legacy).save(os.path.join(folder, "ic_launcher.png"))
        make_round_icon(legacy).save(os.path.join(folder, "ic_launcher_round.png"))
        make_foreground(fg).save(os.path.join(folder, "ic_launcher_foreground.png"))
        print(f"  wrote {suffix}: {legacy}px legacy, {fg}px foreground")

    # Update adaptive icon background color to brand dark
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
