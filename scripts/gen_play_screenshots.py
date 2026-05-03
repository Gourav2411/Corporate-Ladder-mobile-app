#!/usr/bin/env python3
"""
Generate Play Store promotional assets for LinkedOut.

Outputs (all saved under /app/output/play-store/screenshots/):
  Phone    1080x1920 (9:16)  × 6 screenshots
  7"  tab  1200x1920 (9:16, portrait, within 320-3840 spec)  × 4 screenshots
  10" tab  1600x2560 (9:16, portrait, within 1080-7680 spec) × 4 screenshots

Style: CRED × Swiggy premium. Deep-black background, coral accent,
glass-morphism cards, satirical workplace tagline, brand logo watermark.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "output" / "play-store" / "screenshots"
OUT_DIR.mkdir(parents=True, exist_ok=True)
LOGO_PATH = ROOT / "output" / "play-store" / "icon-512.png"

# Brand palette (must match /app/src/styles.scss)
BG_BLACK = (8, 11, 19)
BG_DEEP_NAVY = (12, 20, 35)
ACCENT_CORAL = (252, 128, 25)    # #FC8019
ACCENT_CYAN = (56, 189, 248)     # #38BDF8
ACCENT_GOLD = (229, 192, 123)    # #E5C07B
ACCENT_CRIMSON = (244, 63, 94)   # #F43F5E
TEXT_PRIMARY = (245, 245, 245)
TEXT_MUTED = (148, 163, 184)
CARD_GLASS = (255, 255, 255, 12)

# Font loading with graceful fallback
def _load_font(size, bold=False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for c in candidates:
        if Path(c).exists():
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()

# Each slide = (tag, big_headline, sub_headline, accent_rgb, feature_bullets)
SLIDES = [
    ("01_hero", "CLIMB\nTHE LADDER", "Doing absolutely\nno actual work.",
     ACCENT_CORAL,
     ["24+ game modes", "100+ skills to unlock", "No ads. No IAP."]),
    ("02_runner", "ENDLESS\nRUNNER", "Jump emails.\nDodge PIPs.\nSurvive Monday.",
     ACCENT_CYAN,
     ["Cinematic tier escalation", "Promotion confetti ceremony", "Subway-Surfers feel"]),
    ("03_modes", "CHOOSE\nYOUR\nPOISON", "Endless, Championship,\nTakeover, Quiet Quitting...",
     ACCENT_CORAL,
     ["24 gameplay modes", "Seasonal leaderboards", "Bounty board"]),
    ("04_social", "THE\nWATERCOOLER", "Anonymous\nworkplace rants.\nReplies & @mentions.",
     ACCENT_CYAN,
     ["Thread titles + replies", "@username tagging", "Upvote the chaos"]),
    ("05_tier", "FROM\nCUBICLE TO\nPENTHOUSE", "Visuals escalate\nas your synergy\nclimbs.",
     ACCENT_GOLD,
     ["6 cinematic tiers", "Tier-up confetti", "Hellscape endgame"]),
    ("06_company", "RUN\nYOUR\nCOMPANY", "Found it.\nRecruit friends.\nLay them off.",
     ACCENT_CRIMSON,
     ["20-seat companies", "Private leaderboards", "Ghost-race mode"]),
]

def make_slide(slide, width, height, filename):
    """Render one promotional slide at (width x height) with the usual layout."""
    tag, headline, sub, accent, bullets = slide
    img = Image.new("RGB", (width, height), BG_BLACK)
    draw = ImageDraw.Draw(img, "RGBA")

    # Diagonal accent bar across the top
    draw.polygon(
        [(0, 0), (width, 0), (width, int(height * 0.04)), (0, int(height * 0.08))],
        fill=accent,
    )

    # Soft radial glow in the centre (simulated with concentric faded ellipses)
    for r, a in [(width * 0.9, 8), (width * 0.6, 14), (width * 0.35, 22)]:
        cx, cy = width // 2, int(height * 0.45)
        draw.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            fill=(accent[0], accent[1], accent[2], a),
        )

    # Logo watermark (top-left)
    if LOGO_PATH.exists():
        logo = Image.open(LOGO_PATH).convert("RGBA")
        logo_size = int(width * 0.11)
        logo = logo.resize((logo_size, logo_size), Image.LANCZOS)
        img.paste(logo, (int(width * 0.06), int(height * 0.05)), logo)

    # "LinkedOut" wordmark next to logo
    mark_font = _load_font(int(width * 0.04), bold=True)
    draw.text((int(width * 0.20), int(height * 0.065)), "LinkedOut", fill=TEXT_PRIMARY, font=mark_font)
    tag_font = _load_font(int(width * 0.02), bold=False)
    draw.text((int(width * 0.20), int(height * 0.095)), "Corporate Ladder Simulator", fill=TEXT_MUTED, font=tag_font)

    # Headline
    head_size = int(width * 0.10) if len(headline.split("\n")[0]) > 6 else int(width * 0.13)
    head_font = _load_font(head_size, bold=True)
    y = int(height * 0.22)
    for line in headline.split("\n"):
        bbox = draw.textbbox((0, 0), line, font=head_font)
        tw = bbox[2] - bbox[0]
        draw.text(((width - tw) // 2, y), line, fill=accent, font=head_font)
        y += int(head_size * 1.0)

    # Sub-headline
    sub_font = _load_font(int(width * 0.042), bold=False)
    y += int(height * 0.015)
    for line in sub.split("\n"):
        bbox = draw.textbbox((0, 0), line, font=sub_font)
        tw = bbox[2] - bbox[0]
        draw.text(((width - tw) // 2, y), line, fill=TEXT_PRIMARY, font=sub_font)
        y += int(width * 0.055)

    # Feature bullet pills at the bottom
    pill_font = _load_font(int(width * 0.028), bold=True)
    pill_y = int(height * 0.80)
    for b in bullets:
        bbox = draw.textbbox((0, 0), b, font=pill_font)
        tw = bbox[2] - bbox[0]
        pill_w = tw + int(width * 0.09)
        pill_h = int(width * 0.06)
        pill_x = (width - pill_w) // 2
        draw.rounded_rectangle(
            [pill_x, pill_y, pill_x + pill_w, pill_y + pill_h],
            radius=pill_h // 2,
            fill=(255, 255, 255, 18),
            outline=accent,
            width=2,
        )
        draw.text(
            ((width - tw) // 2, pill_y + (pill_h - (bbox[3] - bbox[1])) // 2 - 2),
            b,
            fill=TEXT_PRIMARY,
            font=pill_font,
        )
        pill_y += int(pill_h * 1.3)

    # Bottom-right "24+ modes" tagline stripe
    tagline_font = _load_font(int(width * 0.022), bold=True)
    stripe_y = height - int(height * 0.035)
    draw.rectangle([0, stripe_y, width, height], fill=accent)
    tagline = "TAP · GRIND · GET LINKEDOUT"
    bbox = draw.textbbox((0, 0), tagline, font=tagline_font)
    tw = bbox[2] - bbox[0]
    draw.text(
        ((width - tw) // 2, stripe_y + (height - stripe_y - (bbox[3] - bbox[1])) // 2 - 2),
        tagline,
        fill=BG_BLACK,
        font=tagline_font,
    )

    img.save(OUT_DIR / filename, "PNG", optimize=True)
    return OUT_DIR / filename


# ─── Generate sets ─────────────────────────────────────────────────────────
sizes = {
    "phone":   ("phone",   1080, 1920),
    "tablet7": ("tab7",    1200, 1920),
    "tablet10": ("tab10",  1600, 2560),
}

for key, (prefix, w, h) in sizes.items():
    print(f"\n── {key.upper()}  ({w}×{h}) ──")
    # Phone ships all 6; tablets ship the first 4 (Play Store requires max 8)
    count = 6 if key == "phone" else 4
    for slide in SLIDES[:count]:
        fn = f"{prefix}-{slide[0]}.png"
        out = make_slide(slide, w, h, fn)
        size_kb = out.stat().st_size // 1024
        print(f"  ✓ {fn}  ({size_kb} KB)")

print("\nAll screenshots saved to:", OUT_DIR)
