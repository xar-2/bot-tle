import yt_dlp
import os
import asyncio
from typing import Dict, Any, List

class MediaDownloader:
    def __init__(self):
        self.download_dir = "downloads"
        if not os.path.exists(self.download_dir):
            os.makedirs(self.download_dir)
        
        # Load proxy from .env (optional)
        self.proxy = os.getenv("PROXY_URL")

        # Essential: Look for cookies.txt
        self.cookie_file = None
        for path in ["../cookies.txt", "cookies.txt"]:
            if os.path.exists(path):
                self.cookie_file = path
                print(f"🍪 Cookie system active: {path}")
                break
        
        self.cancelled_users = set()

    def cancel_download(self, user_id: str):
        """Menandai user untuk membatalkan proses download yang sedang berjalan."""
        self.cancelled_users.add(str(user_id))

    def _get_base_opts(self, url: str = "") -> Dict[str, Any]:
        opts = {
            'quiet': True,
            'no_warnings': True,
            'nocheckcertificate': True,
            'ignoreerrors': False,
            'addmetadata': True,
            # Trik Bypass Bot Detection: Gunakan client Android
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'web'],
                    'skip': ['dash', 'hls']
                }
            },
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        # Cari cookies.txt secara absolut
        base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        cookie_paths = [
            os.path.join(base_path, "cookies.txt"),
            "cookies.txt"
        ]
        
        for p in cookie_paths:
            if os.path.exists(p):
                opts['cookiefile'] = p
                break
        
        if self.proxy:
            opts['proxy'] = self.proxy
        
        return opts

    async def get_info(self, url: str) -> Dict[str, Any]:
        ydl_opts = self._get_base_opts(url)
        ydl_opts['extract_flat'] = True  # Mencegah error 'format not available' saat search
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                loop = asyncio.get_event_loop()
                # process=False agar yt-dlp tidak mengecek ketersediaan format video
                info = await loop.run_in_executor(None, lambda: ydl.extract_info(url, download=False, process=False))
                
                if 'entries' in info:
                    entries = list(info['entries'])
                    if entries:
                        info = entries[0]
                    else:
                        raise Exception("Tidak ada hasil ditemukan")

                return {
                    "title": info.get("title", "Untitled Media"),
                    "thumbnail": info.get("thumbnail"),
                    "duration_string": info.get("duration_string") or "N/A",
                    "uploader": info.get("uploader") or info.get("uploader_id"),
                    "platform": info.get("extractor_key", "generic").lower(),
                    "url": info.get("original_url") or info.get("webpage_url") or url
                }
        except Exception as e:
            print(f"Extraction Error: {str(e)}")
            raise Exception(f"Gagal mengambil info: {str(e)}")

    async def download(self, url: str, type: str, quality: str, user_id: str) -> Dict[str, Any]:
        # Gunakan %(id)s agar nama file pendek dan aman, hindari error File name too long
        outtmpl = os.path.join(self.download_dir, f"{user_id}_%(id)s.%(ext)s")
        ydl_opts = self._get_base_opts(url)

        # Mekanisme pembatalan
        user_id_str = str(user_id)
        self.cancelled_users.discard(user_id_str)

        def check_cancel(d):
            if user_id_str in self.cancelled_users:
                raise Exception("DOWNLOAD_CANCELLED")
        
        ydl_opts['progress_hooks'] = [check_cancel]
        
        # Tambahkan restrictfilenames agar karakter aneh/emoji dihapus dari nama file
        ydl_opts['restrictfilenames'] = True

        # Optimasi opsi untuk stabilitas
        ydl_opts.update({
            'retries': 10,
            'fragment_retries': 10,
            'retry_sleep_functions': {'http': lambda n: 5},
            'buffersize': 1024 * 256,
        })

        if type == 'mp3':
            ydl_opts.update({
                'format': 'bestaudio/best',
                'outtmpl': outtmpl,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
            })
        else:
            # Gunakan format yang lebih ringan & kompatibel (MP4) untuk menghindari transcoding berat
            ydl_opts.update({
                'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best',
                'outtmpl': outtmpl,
                'merge_output_format': 'mp4',
            })

        print(f"🚀 Starting download: {url} (Type: {type}, User: {user_id})")

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                loop = asyncio.get_event_loop()
                info = await loop.run_in_executor(None, lambda: ydl.extract_info(url, download=True))
                
                if 'entries' in info:
                    entries = list(info['entries'])
                    if entries:
                        info = entries[0]
                    else:
                        raise Exception("Tidak ada hasil ditemukan")
                
                file_path = ydl.prepare_filename(info)
                
                if type == 'mp3':
                    file_path = os.path.splitext(file_path)[0] + ".mp3"
                elif not file_path.endswith(".mp4"):
                    base = os.path.splitext(file_path)[0]
                    if os.path.exists(base + ".mp4"):
                        file_path = base + ".mp4"

                return {
                    "status": "success",
                    "title": info.get("title") or "Video Downloaded",
                    "file_path": file_path
                }
        except Exception as e:
            if str(e) == "DOWNLOAD_CANCELLED":
                raise Exception("Download dibatalkan oleh pengguna.")
            raise Exception(f"Gagal mendownload: {str(e)}")

    async def download_photos(self, url: str, user_id: str) -> List[str]:
        ydl_opts = self._get_base_opts(url)
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                loop = asyncio.get_event_loop()
                info = await loop.run_in_executor(None, lambda: ydl.extract_info(url, download=False))
                
                photos = []
                if 'entries' in info:
                    for entry in info['entries']:
                        if entry.get('url') and any(ext in entry.get('url', '').lower() for ext in ['.jpg', '.png', '.webp']):
                            photos.append(entry['url'])
                
                if not photos and info.get('thumbnail'):
                    photos.append(info['thumbnail'])
                
                return photos
        except Exception:
            return []

media_downloader = MediaDownloader()
