const axios = require("axios");
const apiService = require("../services/apiService");

// Cache URL panjang agar tidak error BUTTON_DATA_INVALID (max 64 char)
const urlCache = new Map();

// Cache halaman novel per sesi baca
const pageCache = new Map();

const CHARS_PER_PAGE = 1800; // Ukuran per halaman (nyaman dibaca di HP)

function buildPageText(title, content, page, totalPages) {
  return `📖 *${escapeMarkdown(title)}*\n` +
         `📄 Halaman ${page} dari ${totalPages}\n` +
         `━━━━━━━━━━━━━━━━━━━━\n\n` +
         `${content}\n\n` +
         `━━━━━━━━━━━━━━━━━━━━\n` +
         `_Halaman ${page}/${totalPages} • Bot\\-tle Reader_`;
}

function escapeMarkdown(text) {
  // Escape karakter spesial MarkdownV2
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

function buildNavButtons(cacheKey, page, totalPages) {
  const buttons = [];
  const row = [];

  if (page > 1) {
    row.push({ text: "◀️ Sebelumnya", callback_data: `novel_page|${cacheKey}|${page - 1}` });
  }
  if (page < totalPages) {
    row.push({ text: "▶️ Berikutnya", callback_data: `novel_page|${cacheKey}|${page + 1}` });
  }

  if (row.length > 0) buttons.push(row);

  buttons.push([
    { text: `📄 ${page}/${totalPages}`, callback_data: "noop" },
    { text: "❌ Tutup", callback_data: "cancel" }
  ]);

  return { inline_keyboard: buttons };
}

const novelHandler = {
  handleSearch: async (bot, msg, query) => {
    const chatId = msg.chat.id;

    if (!query || query.trim() === "") {
      return bot.sendMessage(
        chatId,
        "📖 *Pencarian Novel*\n\nSilakan masukkan judul novel yang ingin dicari\\!\nContoh: `/novel solo leveling`",
        { parse_mode: "MarkdownV2" }
      );
    }

    bot.sendChatAction(chatId, "typing");

    try {
      // Prioritas: cari tipe lightnovel dulu, fallback ke semua tipe
      let results = null;
      try {
        const res = await axios.get(
          `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&type=lightnovel&limit=5`
        );
        results = res.data.data;
      } catch (_) {}

      if (!results || results.length === 0) {
        const resAlt = await axios.get(
          `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&limit=5`
        );
        results = resAlt.data.data;
      }

      if (!results || results.length === 0) {
        return bot.sendMessage(chatId, "❌ Novel tidak ditemukan\\. Coba judul yang berbeda\\.", { parse_mode: "MarkdownV2" });
      }

      const novel = results[0];
      const authors = novel.authors?.map(a => a.name).join(", ") || "N/A";
      const serialization = novel.serializations?.map(s => s.name).join(", ") || "N/A";
      const genres = novel.genres?.map(g => g.name).join(", ") || "N/A";

      // Simpan URL di cache dengan key pendek
      const cacheKey = `nvl_${novel.mal_id}`;
      urlCache.set(cacheKey, novel.url);

      const synopsis = novel.synopsis
        ? novel.synopsis.slice(0, 450) + "..."
        : "Tidak ada sinopsis.";

      // Tampilan card info novel (menggunakan HTML agar lebih aman dari karakter spesial)
      const caption =
        `📖 <b>${novel.title}</b>\n` +
        `🇯🇵 ${novel.title_japanese || "-"}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `✍️ <b>Penulis:</b> ${authors}\n` +
        `🏢 <b>Penerbit:</b> ${serialization}\n` +
        `⭐ <b>Skor:</b> ${novel.score || "N/A"}\n` +
        `📂 <b>Tipe:</b> ${novel.type || "N/A"}\n` +
        `📅 <b>Status:</b> ${novel.status || "N/A"}\n` +
        `📑 <b>Volumes:</b> ${novel.volumes || "N/A"}\n` +
        `🎭 <b>Genre:</b> ${genres}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 <b>Sinopsis:</b>\n<i>${synopsis}</i>`;

      const searchToRead = `https://www.google.com/search?q=read+online+novel+${encodeURIComponent(novel.title)}`;

      const opts = {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📖 Baca via Bot-tle", callback_data: `read_novel|${cacheKey}` }],
            [{ text: "🔍 Cari Sumber Lain", url: searchToRead }],
            [{ text: "🌐 Detail MyAnimeList", url: novel.url }],
            [{ text: "❌ Tutup", callback_data: "cancel" }]
          ]
        }
      };

      if (novel.images?.jpg?.image_url) {
        await bot.sendPhoto(chatId, novel.images.jpg.image_url, { caption, ...opts });
      } else {
        await bot.sendMessage(chatId, caption, opts);
      }
    } catch (err) {
      console.error("Novel Search Error:", err.message);
      await bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mencari novel\\. Coba lagi\\.", { parse_mode: "MarkdownV2" });
    }
  },

  // Handler saat tombol "Baca via Bot-tle" diklik
  handleText: async (bot, query) => {
    const cacheKey = query.data.split("|")[1];
    const url = urlCache.get(cacheKey);
    const chatId = query.message.chat.id;

    if (!url) {
      return bot.answerCallbackQuery(query.id, {
        text: "❌ Sesi kadaluarsa, silakan cari ulang novel.",
        show_alert: true
      });
    }

    bot.answerCallbackQuery(query.id, { text: "📖 Mengambil konten novel..." });
    const statusMsg = await bot.sendMessage(chatId, "🕵️ *Sedang mengambil teks novel\\.\\.\\.*\n_Mohon tunggu sebentar\\._", {
      parse_mode: "MarkdownV2"
    });

    try {
      const result = await apiService.readNovel(url);

      // Pecah konten menjadi halaman-halaman kecil
      const pages = [];
      const rawContent = result.content;
      for (let i = 0; i < rawContent.length; i += CHARS_PER_PAGE) {
        pages.push(rawContent.slice(i, i + CHARS_PER_PAGE));
      }

      if (pages.length === 0) {
        throw new Error("Konten kosong, tidak ada teks yang bisa dibaca.");
      }

      // Simpan halaman di cache dengan key sesi unik
      const sessionKey = `read_${chatId}_${cacheKey}`;
      pageCache.set(sessionKey, { title: result.title, pages });

      // Tampilkan halaman pertama
      await bot.deleteMessage(chatId, statusMsg.message_id);
      await bot.sendMessage(
        chatId,
        buildPageText(result.title, pages[0], 1, pages.length),
        {
          parse_mode: "MarkdownV2",
          reply_markup: buildNavButtons(sessionKey, 1, pages.length)
        }
      );
    } catch (err) {
      console.error("Read Novel Error:", err.message);
      await bot.editMessageText(
        `❌ *Gagal mengambil teks*\n\n_${err.message}_\n\n_Situs mungkin memerlukan cookies atau membatasi akses bot\\._`,
        {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: "MarkdownV2"
        }
      );
    }
  },

  // Handler tombol navigasi halaman (◀️ / ▶️)
  handlePage: async (bot, query) => {
    const parts = query.data.split("|");
    const sessionKey = parts[1];
    const page = parseInt(parts[2]);
    const chatId = query.message.chat.id;

    const session = pageCache.get(sessionKey);
    if (!session) {
      return bot.answerCallbackQuery(query.id, {
        text: "❌ Sesi baca kadaluarsa, silakan cari ulang.",
        show_alert: true
      });
    }

    bot.answerCallbackQuery(query.id, { text: `📄 Berpindah ke halaman ${page}...` });

    const { title, pages } = session;
    const content = pages[page - 1];

    try {
      await bot.editMessageText(
        buildPageText(title, content, page, pages.length),
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: "MarkdownV2",
          reply_markup: buildNavButtons(sessionKey, page, pages.length)
        }
      );
    } catch (err) {
      console.error("Novel Page Error:", err.message);
    }
  }
};

module.exports = novelHandler;
