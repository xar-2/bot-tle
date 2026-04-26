# Bot-tle 🤖

A modern, hybrid Telegram Bot powered by AI and Media Downloading capabilities. Built with **Node.js** for handling Telegram interactions and **Python (FastAPI)** for heavy-duty media processing and AI.

## 🚀 Fitur Utama
- 💬 **AI Chat**: Terintegrasi dengan Google Gemini AI untuk percakapan cerdas.
- 📥 **Media Downloader**: Download Video/Audio dari YouTube, Instagram, TikTok, dan Twitter menggunakan `yt-dlp`.
- 🔍 **Web Search**: Mencari informasi langsung dari internet tanpa meninggalkan Telegram.
- 👑 **Advanced Admin Panel**:
    - Statistik penggunaan real-time.
    - Sistem Broadcast (kirim pesan ke semua user).
    - Moderasi (Ban/Unban user berdasarkan ID).
    - Backup Database & Monitoring Sistem.
- 🛡️ **Anti-Spam**: Proteksi rate-limiting untuk mencegah penyalahgunaan.
- 🧹 **Auto-Cleanup**: Menghapus file secara otomatis setelah dikirim untuk menghemat penyimpanan server.

## 🛠️ Tech Stack
- **Frontend**: Node.js (node-telegram-bot-api)
- **Backend**: Python 3.10+ (FastAPI, yt-dlp)
- **Database**: SQLite
- **Security**: Internal API Key Authentication

## ⚙️ Setup & Instalasi

1. **Clone Repository**
   ```bash
   git clone https://github.com/username/bot-tle.git
   cd bot-tle
   ```

2. **Konfigurasi Environment**
   Buat file `.env` di root direktori:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token
   GEMINI_API_KEY=your_gemini_key
   ADMIN_IDS=12345678,87654321
   INTERNAL_API_TOKEN=generate_random_string
   ```

3. **Jalankan Bot**
   Cukup gunakan script launcher:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

## 📝 Catatan Penting
- Pastikan **FFmpeg** sudah terinstal di server untuk proses konversi media.
- Gunakan `cookies.txt` jika kamu sering mendownload konten yang dibatasi usia (age-restricted).

## 📄 License
MIT License
