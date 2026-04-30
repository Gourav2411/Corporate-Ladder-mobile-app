#!/usr/bin/env python3
"""Capture Play Store phone screenshots from the live site.
Runs the live web app at 1080×1920 (Play Store-ready) and shoots
4 product screens. Output goes to /app/output/play-store/screenshots/.
"""
import asyncio
import os
import sys
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "https://corporateladder.xyz"
OUT  = "/app/output/play-store/screenshots"
W, H = 1080, 1920

os.makedirs(OUT, exist_ok=True)


async def capture(page, name: str) -> None:
    path = os.path.join(OUT, name)
    await page.screenshot(path=path, full_page=False, omit_background=False)
    print(f"  saved {name}")


async def main() -> None:
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
        context = await browser.new_context(
            viewport={"width": W, "height": H},
            device_scale_factor=2,
            user_agent="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
            is_mobile=True,
            has_touch=True,
        )
        page = await context.new_page()

        # 1) Home — Watercooler hero card visible
        print("[1/4] Home...")
        await page.goto(BASE, wait_until="load", timeout=60_000)
        # Allow Angular hydration + hero preview fetch
        await page.wait_for_timeout(6000)
        # Best-effort dismiss any onboarding/auth modal so the menu is clean
        for sel in [
            'button:has-text("Maybe Later")',
            'button:has-text("Continue as Guest")',
            'button:has-text("Skip")',
        ]:
            try:
                el = await page.query_selector(sel)
                if el:
                    await el.click(timeout=1500)
                    await page.wait_for_timeout(300)
            except Exception:
                pass
        await capture(page, "01-home.png")

        # 2) Roast My Career
        print("[2/4] Roast...")
        try:
            await page.click('[data-testid="open-roast-btn"]', timeout=5000)
        except Exception:
            try:
                await page.click('text=ROAST_MY_CAREER', timeout=5000)
            except Exception:
                pass
        await page.wait_for_timeout(1500)
        await capture(page, "02-roast.png")

        # 3) Companies entry
        print("[3/4] Companies...")
        await page.goto(BASE, wait_until="load", timeout=60_000)
        await page.wait_for_timeout(4000)
        try:
            await page.click('[data-testid="open-companies-btn"]', timeout=5000)
        except Exception:
            try:
                await page.click('text=COMPANIES', timeout=5000)
            except Exception:
                pass
        await page.wait_for_timeout(1500)
        await capture(page, "03-companies.png")

        # 4) Watercooler
        print("[4/4] Watercooler...")
        await page.goto(BASE, wait_until="load", timeout=60_000)
        await page.wait_for_timeout(4000)
        try:
            await page.click('text=THE_WATERCOOLER', timeout=5000)
        except Exception:
            try:
                await page.click('text=WATERCOOLER', timeout=5000)
            except Exception:
                pass
        await page.wait_for_timeout(2000)
        await capture(page, "04-watercooler.png")

        await browser.close()
        print("done.")


asyncio.run(main())
