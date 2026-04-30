const apiService = require("../services/apiService");
const dbService = require("../services/dbService");
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");

const downloadHandler = {
  handleLink: async (bot, msg, url) => {
    const chatId = msg.chat.id;

    bot.sendChatAction(chatId, "typing");

    try {
      const info = await apiService.getDownloadInfo(url);
      const mediaUrl = info.url || url; // Ambil URL asli hasil pencarian

      const inline_keyboard = [
        [
          { text: "🎬 Video (Best)", callback_data: `dl|best|${mediaUrl}` },
          { text: "🎵 Audio (MP3)", callback_data: `dl|mp3|${mediaUrl}` }
        ]
      ];

      if (['instagram', 'twitter', 'twitter/x', 'facebook', 'reddit'].includes(info.platform)) {
        inline_keyboard.push([{ text: "🖼 Download Photo/Image", callback_data: `dl|photo|${url}` }]);
      }

      inline_keyboard.push([{ text: "❌ Batal", callback_data: "cancel" }]);

      const opts = {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard }
      };

      const caption = `🎬 *${info.title}*\n\n` +
                      `👤 Author: ${info.uploader || "Unknown"}\n` +
                      `⏱ Durasi: ${info.duration_string || "N/A"}\n` +
                      `🌐 Platform: ${info.platform || "Unknown"}`;

      if (info.thumbnail) {
        await bot.sendPhoto(chatId, info.thumbnail, { caption, ...opts });
      } else {
        await bot.sendMessage(chatId, caption, opts);
      }
    } catch (err) {
      await bot.sendMessage(chatId, `⚠️ ${err.message}`);
    }
  },

  execute: async (bot, query) => {
    const { data, message } = query;
    const chatId = message.chat.id;
    const userId = query.from.id;
    const parts = data.split("|");
    const type = parts[1];
    const url = parts.slice(2).join("|"); // ✅ FIX: handle URL yang mengandung '|'

    await bot.answerCallbackQuery(query.id, { text: "⏳ Sedang diproses..." });
    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: message.message_id });

    const statusMsg = await bot.sendMessage(chatId, "🔄 *Memproses...* Mohon tunggu.", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Batalkan", callback_data: `cancel_dl|${userId}` }]]
      }
    });

    const frames = [
      "▰▱▱▱▱▱▱▱▱▱", "▰▰▱▱▱▱▱▱▱▱", "▰▰▰▱▱▱▱▱▱▱",
      "▰▰▰▰▱▱▱▱▱▱", "▰▰▰▰▰▱▱▱▱▱", "▰▰▰▰▰▰▱▱▱▱",
      "▰▰▰▰▰▰▰▱▱▱", "▰▰▰▰▰▰▰▰▱▱", "▰▰▰▰▰▰▰▰▰▱",
      "▰▰▰▰▰▰▰▰▰▰"
    ];
    let frameIndex = 0;
    const loadingInterval = setInterval(async () => {
      try {
        await bot.editMessageText(`⏳ *Sedang Mendownload...*\n${frames[frameIndex % frames.length]}`, {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: "Markdown"
        });
        frameIndex++;
      } catch {}
    }, 1500);

    try {
      if (type === "photo") {
        clearInterval(loadingInterval);
        const photos = await apiService.getPhotos(url, userId);
        if (photos && photos.length > 0) {
          dbService.incrementStat(userId, "downloads");
          for (const photo of photos) {
            await bot.sendPhoto(chatId, photo);
          }
          await bot.deleteMessage(chatId, statusMsg.message_id);
        } else {
          throw new Error("Tidak ditemukan foto di link tersebut.");
        }
        return;
      }

      const result = await apiService.executeDownload(url, type, "best", userId);
      clearInterval(loadingInterval);

      dbService.incrementStat(userId, "downloads");

      // ✅ FIX: Construct file URL dari Python service
      const filename = path.basename(result.file_path);
      const fileUrl = `${config.api.pythonUrl}/files/${filename}`;

      console.log(`[Debug] Sending file from: ${fileUrl}`);

      if (type === "mp3") {
        await bot.sendAudio(chatId, fileUrl, { caption: `✅ ${result.title}` });
      } else {
        await bot.sendVideo(chatId, fileUrl, { caption: `✅ ${result.title}` });
      }

      await bot.deleteMessage(chatId, statusMsg.message_id);

    } catch (err) {
      clearInterval(loadingInterval);
      console.error("Download Execute Error:", err.message);
      await bot.editMessageText(`❌ *Gagal:* ${err.message}`, {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: "Markdown"
      });
    }
  },

  handleCancel: async (bot, query) => {
    const { data, message } = query;
    const userId = data.split("|")[1];
    const chatId = message.chat.id;

    await bot.answerCallbackQuery(query.id, { text: "⏳ Membatalkan..." });
    await apiService.cancelDownload(userId);
    await bot.editMessageText("⏹ *Download Dibatalkan.*", {
      chat_id: chatId,
      message_id: message.message_id,
      parse_mode: "Markdown"
    });
  }
};

module.exports = downloadHandler;