from playwright.async_api import async_playwright
import os
import json
import asyncio

# Gunakan stealth jika tersedia
try:
    from playwright_stealth import stealth_async
    STEALTH_AVAILABLE = True
except ImportError:
    STEALTH_AVAILABLE = False
    print("⚠️ playwright-stealth tidak tersedia, berjalan tanpa stealth mode")

class WebScraperService:
    def __init__(self):
        # Gunakan path absolut agar tidak error saat dijalankan dari direktori berbeda
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.cookie_file = os.path.join(base_dir, "cookies.json")

    async def extract_novel_text(self, url: str) -> dict:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            
            page = await context.new_page()
            # Aktifkan penyamaran jika tersedia
            if STEALTH_AVAILABLE:
                await stealth_async(page)
            
            # Gunakan cookies jika ada
            if os.path.exists(self.cookie_file):
                try:
                    with open(self.cookie_file, 'r') as f:
                        cookies = json.load(f)
                        # Standarisasi format cookies untuk Playwright
                        formatted_cookies = []
                        for c in cookies:
                            cookie = {
                                "name": c["name"],
                                "value": c["value"],
                                "domain": c["domain"] if c["domain"].startswith(".") else f".{c['domain']}",
                                "path": c.get("path", "/")
                            }
                            # Map expirationDate ke expires jika ada
                            if "expirationDate" in c:
                                cookie["expires"] = c["expirationDate"]
                            elif "expires" in c:
                                cookie["expires"] = c["expires"]
                                
                            formatted_cookies.append(cookie)
                            
                        await context.add_cookies(formatted_cookies)
                        print(f"🍪 [SUCCESS] Loaded {len(formatted_cookies)} web cookies.")
                except Exception as e:
                    print(f"⚠️ Cookie error: {e}")

            try:
                print(f"🕵️ Scrapping novel: {url}")
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                
                # Tunggu konten utama muncul (biasanya di div tertentu)
                # Kita coba ambil elemen artikel atau div yang mengandung banyak teks
                content = await page.evaluate("""() => {
                    // Cari elemen yang paling mungkin berisi konten novel
                    const selectors = ['article', '.entry-content', '.chapter-content', '#content', '.reader-content'];
                    for (let s of selectors) {
                        const el = document.querySelector(s);
                        if (el && el.innerText.length > 500) return el.innerText;
                    }
                    // Fallback: ambil body tapi bersihkan
                    return document.body.innerText;
                }""")
                
                title = await page.title()
                
                return {
                    "status": "success",
                    "title": title,
                    "content": content[:4000] # Limit biar gak kepotong Telegram
                }
            except Exception as e:
                return {"status": "error", "message": str(e)}
            finally:
                await browser.close()

scraper_service = WebScraperService()
