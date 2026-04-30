const axios = require("axios");
const apiService = require("../services/apiService");

// Cache untuk menyimpan URL panjang agar tidak error BUTTON_DATA_INVALID
const urlCache = new Map();

const novelHandler = {
  handleSearch: async (bot, msg, query) => {
    const chatId = msg.chat.id;

    if (!query) {
      return bot.sendMessage(chatId, "📖 *Pencarian Novel*\n\nSilakan masukkan judul novel yang ingin dicari!\nContoh: `/novel reincarnated as a slime`", { parse_mode: "Markdown" });
    }

    bot.sendChatAction(chatId, "typing");

    try {
      // Mencari dengan tipe 'lightnovel' atau 'novel'
      const res = await axios.get(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&type=lightnovel&limit=5`);
      let results = res.data.data;

      // Jika lightnovel tidak ditemukan, coba cari secara umum
      if (!results || results.length === 0) {
        const resAlt = await axios.get(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&limit=5`);
        results = resAlt.data.data;
      }

      if (!results || results.length === 0) {
        return bot.sendMessage(chatId, "❌ Novel tidak ditemukan.");
      }

      const novel = results[0];
      const authors = novel.authors.map(a => a.name).join(", ") || "N/A";
      const serialization = novel.serializations.map(s => s.name).join(", ") || "N/A";
      
      // Simpan URL di cache agar data tombol tidak terlalu panjang
      const cacheKey = `nvl_${novel.mal_id}`;
      urlCache.set(cacheKey, novel.url);
      
      const caption = `📖 *${novel.title}*\n` +
                      `🇯🇵 *${novel.title_japanese || "-"}*\n` +
                      `────────────────────\n` +
                      `✍️ *Penulis:* ${authors}\n` +
                      `🏢 *Penerbit:* ${serialization}\n` +
                      `🌟 *Skor:* ${novel.score || "N/A"}\n` +
                      `📖 *Tipe:* ${novel.type || "N/A"}\n` +
                      `📅 *Status:* ${novel.status || "N/A"}\n` +
                      `📑 *Volumes:* ${novel.volumes || "N/A"}\n` +
                      `🎭 *Genre:* ${novel.genres.map(g => g.name).join(", ")}\n\n` +
                      `📝 *Sinopsis:* \n_${novel.synopsis ? novel.synopsis.slice(0, 500) + "..." : "Tidak ada sinopsis."}_`;

      const searchToRead = `https://www.google.com/search?q=read+online+novel+${encodeURIComponent(novel.title)}`;

      const opts = {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📖 Baca Teks Bot-tle", callback_data: `read_novel|${cacheKey}` }],
            [{ text: "🔍 Cari Sumber Lain", url: searchToRead }],
            [{ text: "🌐 Detail di MyAnimeList", url: novel.url }],
            [{ text: "❌ Tutup", callback_data: "cancel" }]
          ]
        }
      };

      if (novel.images.jpg.image_url) {
        await bot.sendPhoto(chatId, novel.images.jpg.image_url, { caption, ...opts });
      } else {
        await bot.sendMessage(chatId, caption, opts);
      }
    } catch (err) {
      console.error("Novel Search Error:", err.message);
      await bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mencari novel.");
    }
  },

  handleText: async (bot, query) => {
    const cacheKey = query.data.split("|")[1];
    const url = urlCache.get(cacheKey);
    const chatId = query.message.chat.id;

    if (!url) {
      return bot.answerCallbackQuery(query.id, { text: "❌ Sesi kadaluarsa, silakan cari ulang novelnya.", show_alert: true });
    }

    bot.answerCallbackQuery(query.id, { text: "📖 Menyiapkan bacaan..." });
    const statusMsg = await bot.sendMessage(chatId, "🕵️ *Sedang menembus anti-bot dan mengambil teks...*", { parse_mode: "Markdown" });

    try {
      const result = await apiService.readNovel(url);
      
      // Kirim judul dan pemisah menggunakan Markdown
      await bot.sendMessage(chatId, `📖 *${result.title}*\n────────────────────`, { parse_mode: "Markdown" });
      
      // Kirim konten teks novel tanpa Markdown (plain text) agar aman dari karakter spesial
      const chunks = [];
      const rawContent = result.content;
      const chunkSize = 3900; // Ukuran aman per pesan Telegram
      for (let i = 0; i < rawContent.length; i += chunkSize) {
        chunks.push(rawContent.slice(i, i + chunkSize));
      }
      for (const chunk of chunks) {
        await bot.sendMessage(chatId, chunk);
      }

      await bot.sendMessage(chatId, `────────────────────\n_Konten diekstrak otomatis oleh Bot\-tle_`, { parse_mode: "MarkdownV2" });
      await bot.deleteMessage(chatId, statusMsg.message_id);
    } catch (err) {
      console.error("Read Novel Error:", err.message);
      await bot.editMessageText(`❌ *Gagal mengambil teks:* ${err.message}\n\n_Situs mungkin memblokir akses atau butuh cookies baru._`, {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: "Markdown"
      });
    }
  }
};

module.exports = novelHandler;
