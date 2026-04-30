const axios = require("axios");

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
            [{ text: "📖 Mulai Membaca (Cari Sumber)", url: searchToRead }],
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
  }
};

module.exports = novelHandler;
