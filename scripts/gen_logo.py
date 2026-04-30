#!/usr/bin/env python3
"""Generate the LinkedOut launcher icon via Gemini Nano Banana.

Outputs:
  /app/output/play-store/icon-1024-source.png  (raw 1024x1024 from the model)
  /app/output/play-store/icon-512.png          (downscaled, replaces existing)
  /app/public/icon-512.png                     (web manifest icon)
"""
import asyncio
import base64
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
from PIL import Image

load_dotenv("/app/backend/.env")

PROMPT = (
    "App icon for an Android game called LinkedOut. "
    "Square 1024x1024, bleed to all four corners, no rounded corners (Android adds those). "
    "Style: ultra-premium fintech app icon, CRED x Swiggy aesthetic. "
    "Background: deep midnight navy (#050510) with very subtle film grain and a soft coral (#FC8019) radial glow in the upper-right corner and a small warm gold (#E5C07B) glow in the lower-left. "
    "Centered foreground: a bold, ultra-condensed sans-serif wordmark 'LinkedOut' set on two stacked lines — 'Linked' on the top line in pure white, 'Out' on the bottom line in coral (#FC8019). "
    "Across the word 'Out' there is a single horizontal strip of warm gold-foil tape (#E5C07B) at a perfect -8 degree tilt, with a slight glossy highlight, like masking tape stuck on top — visually striking the word out. "
    "The wordmark fills roughly 75% of the icon width, kerning is tight, weight is heavy display (think Cabinet Grotesk Black or Migra). "
    "No emoji, no other glyphs, no people, no buildings, no ladder, no chart, no logos of LinkedIn or any real brand. "
    "Output: photorealistic foil texture, sharp letter edges, premium poster aesthetic, cinematic depth."
)

OUT_DIR = Path("/app/output/play-store")
OUT_DIR.mkdir(parents=True, exist_ok=True)
SRC_PATH = OUT_DIR / "icon-1024-source.png"
ICON_512_PATHS = [OUT_DIR / "icon-512.png", Path("/app/public/icon-512.png")]


async def main() -> int:
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        print("EMERGENT_LLM_KEY missing", file=sys.stderr)
        return 2

    chat = LlmChat(
        api_key=api_key,
        session_id="linkedout-logo-v1",
        system_message="You are an icon designer producing premium app icons.",
    ).with_model("gemini", "gemini-3-pro-image-preview").with_params(modalities=["image", "text"])

    print(f"==> Generating LinkedOut icon (gemini-3-pro-image-preview)...")
    text, images = await chat.send_message_multimodal_response(UserMessage(text=PROMPT))
    print(f"    text response: {(text or '')[:80]}")

    if not images:
        print("==> Model returned no image. Aborting.", file=sys.stderr)
        return 3

    img_bytes = base64.b64decode(images[0]["data"])
    SRC_PATH.write_bytes(img_bytes)
    print(f"==> Saved source: {SRC_PATH} ({len(img_bytes)/1024:.1f} KB)")

    img = Image.open(SRC_PATH).convert("RGB")
    if img.size != (1024, 1024):
        # Crop center-square then upscale/downscale to 1024.
        s = min(img.size)
        left = (img.size[0] - s) // 2
        top = (img.size[1] - s) // 2
        img = img.crop((left, top, left + s, top + s)).resize((1024, 1024), Image.LANCZOS)
        img.save(SRC_PATH, format="PNG", optimize=True)
        print(f"==> Normalised source to 1024x1024.")

    img_512 = img.resize((512, 512), Image.LANCZOS)
    for p in ICON_512_PATHS:
        p.parent.mkdir(parents=True, exist_ok=True)
        img_512.save(p, format="PNG", optimize=True)
        print(f"==> Saved 512: {p}")

    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
