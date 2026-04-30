#!/usr/bin/env python3
"""Rasterise the LinkedOut launcher icons from /app/output/play-store/icon-1024-source.png.

Replaces every legacy + adaptive density inside /app/android/app/src/main/res/.
Produces:
    mipmap-{m,h,x,xx,xxx}hdpi/ic_launcher.png        (legacy round-rect)
    mipmap-{m,h,x,xx,xxx}hdpi/ic_launcher_round.png  (legacy circle)
    mipmap-{m,h,x,xx,xxx}hdpi/ic_launcher_foreground.png (adaptive 108dp)

Adaptive icons keep the source full-bleed; the OS adds the safe-zone mask.
"""
from __future__ import annotations
import sys
from pathlib import Path
from PIL import Image, ImageDraw

SRC = Path("/app/output/play-store/icon-1024-source.png")
RES = Path("/app/android/app/src/main/res")

# (folder_suffix, legacy_size, foreground_size)
DENSITIES = [
    ("mdpi",     48, 108),
    ("hdpi",     72, 162),
    ("xhdpi",    96, 216),
    ("xxhdpi",  144, 324),
    ("xxxhdpi", 192, 432),
]


def _circle_mask(size: int) -> Image.Image:
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).ellipse((0, 0, size, size), fill=255)
    return m


def _rounded_rect_mask(size: int, radius_ratio: float = 0.18) -> Image.Image:
    m = Image.new("L", (size, size), 0)
    r = int(size * radius_ratio)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size - 1, size - 1), radius=r, fill=255)
    return m


def main() -> int:
    if not SRC.exists():
        print(f"Source missing: {SRC}", file=sys.stderr)
        print("Run scripts/gen_logo.py first.", file=sys.stderr)
        return 2

    base = Image.open(SRC).convert("RGBA")
    if base.size != (1024, 1024):
        s = min(base.size)
        l = (base.size[0] - s) // 2
        t = (base.size[1] - s) // 2
        base = base.crop((l, t, l + s, t + s)).resize((1024, 1024), Image.LANCZOS)

    for suffix, legacy, fg in DENSITIES:
        folder = RES / f"mipmap-{suffix}"
        folder.mkdir(parents=True, exist_ok=True)

        # Legacy round-rect
        sq = base.resize((legacy, legacy), Image.LANCZOS)
        sq.putalpha(_rounded_rect_mask(legacy))
        sq.save(folder / "ic_launcher.png", format="PNG", optimize=True)

        # Legacy circle
        circ = base.resize((legacy, legacy), Image.LANCZOS)
        circ.putalpha(_circle_mask(legacy))
        circ.save(folder / "ic_launcher_round.png", format="PNG", optimize=True)

        # Adaptive foreground (full-bleed PNG; OS applies the safe-zone mask)
        adp = base.resize((fg, fg), Image.LANCZOS)
        adp.save(folder / "ic_launcher_foreground.png", format="PNG", optimize=True)

        print(f"==> mipmap-{suffix:8s}  legacy={legacy}px  adaptive={fg}px")

    # Adaptive XML refs the foreground PNG + a colour for the background.
    # The source PNG is full-bleed, so we keep the background colour neutral
    # so it falls through if the OS uses a foreground crop mode.
    bg_color = "#050510"
    values = RES / "values"
    values.mkdir(parents=True, exist_ok=True)
    (values / "ic_launcher_background.xml").write_text(
        f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        f'    <color name="ic_launcher_background">{bg_color}</color>\n'
        f'</resources>\n'
    )
    print(f"==> values/ic_launcher_background.xml = {bg_color}")

    # Adaptive icon XML (mipmap-anydpi-v26)
    anydpi = RES / "mipmap-anydpi-v26"
    anydpi.mkdir(parents=True, exist_ok=True)
    adaptive_xml = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <background android:drawable="@color/ic_launcher_background" />\n'
        '    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n'
        '    <monochrome android:drawable="@mipmap/ic_launcher_foreground" />\n'
        '</adaptive-icon>\n'
    )
    (anydpi / "ic_launcher.xml").write_text(adaptive_xml)
    (anydpi / "ic_launcher_round.xml").write_text(adaptive_xml)
    print("==> mipmap-anydpi-v26 adaptive XMLs (background colour + foreground PNG + monochrome).")

    print("\nIcons regenerated. Re-run scripts/build_apk.sh to bundle them into v10.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
