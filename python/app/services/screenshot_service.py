from playwright.async_api import async_playwright
import os
import uuid
import asyncio

class ScreenshotService:
    def __init__(self):
        self.output_dir = "downloads"
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)

    async def take_screenshot(self, url: str) -> str:
        async with async_playwright() as p:
            # Launch browser
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            
            page = await context.new_page()
            
            # Set timeout 30s
            page.set_default_timeout(30000)
            
            try:
                print(f"📸 Taking screenshot of: {url}")
                await page.goto(url, wait_until="networkidle")
                # Beri jeda sedikit agar animasi web selesai
                await asyncio.sleep(2)
            except Exception as e:
                print(f"⚠️ Screenshot warning (proceeding anyway): {e}")
            
            filename = f"ss_{uuid.uuid4().hex}.png"
            file_path = os.path.join(self.output_dir, filename)
            
            # Take screenshot
            await page.screenshot(path=file_path, full_page=False)
            
            await browser.close()
            return file_path

screenshot_service = ScreenshotService()
