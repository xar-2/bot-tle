const axios = require("axios");

const mangaHandler = {
  handleSearch: async (bot, msg, query) => {
    const chatId = msg.chat.id;

    if (!query) {
      return bot.sendMessage(chatId, "📚 *Pencarian Manga/Novel*\n\nSilakan masukkan judul yang ingin dicari!\nContoh: `/manga solo leveling`", { parse_mode: "Markdown" });
    }

    bot.sendChatAction(chatId, "typing");

    try {
      // Menggunakan Jikan API (MyAnimeList)
      const res = await axios.get(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&limit=5`);
      const results = res.data.data;

      if (!results || results.length === 0) {
        return bot.sendMessage(chatId, "❌ Manga/Novel tidak ditemukan.");
      }

      // Ambil hasil pertama yang paling relevan
      const manga = results[0];
      const authors = manga.authors.map(a => a.name).join(", ") || "N/A";
      const serialization = manga.serializations.map(s => s.name).join(", ") || "N/A";
      
      const caption = `📚 *${manga.title}*\n` +
                      `🇯🇵 *${manga.title_japanese || "-"}*\n` +
                      `────────────────────\n` +
                      `✍️ *Author:* ${authors}\n` +
                      `🏢 *Publisher:* ${serialization}\n` +
                      `🌟 *Skor:* ${manga.score || "N/A"}\n` +
                      `📖 *Tipe:* ${manga.type || "N/A"}\n` +
                      `📅 *Status:* ${manga.status || "N/A"}\n` +
                      `📑 *Chapters:* ${manga.chapters || "N/A"}\n` +
                      `🎭 *Genre:* ${manga.genres.map(g => g.name).join(", ")}\n\n` +
                      `📝 *Sinopsis:* \n_${manga.synopsis ? manga.synopsis.slice(0, 450) + "..." : "Tidak ada sinopsis."}_`;

      const opts = {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🌐 Lihat di MyAnimeList", url: manga.url }],
            [{ text: "❌ Tutup", callback_data: "cancel" }]
          ]
        }
      };

      if (manga.images.jpg.image_url) {
        await bot.sendPhoto(chatId, manga.images.jpg.image_url, { caption, ...opts });
      } else {
        await bot.sendMessage(chatId, caption, opts);
      }
    } catch (err) {
      console.error("Manga Search Error:", err.message);
      await bot.sendMessage(chatId, "❌ Terjadi kesalahan saat menghubungi server MyAnimeList.");
    }
  }
};

module.exports = mangaHandler;
