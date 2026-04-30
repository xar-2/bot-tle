const apiService = require("../services/apiService");
const config = require("../../config/config");
const path = require("path");

const screenshotHandler = {
  handle: async (bot, msg, url) => {
    const chatId = msg.chat.id;

    if (!url) {
      return bot.sendMessage(chatId, "❌ Silakan masukkan URL! Contoh: `/ss google.com`", { parse_mode: "Markdown" });
    }

    const statusMsg = await bot.sendMessage(chatId, "📸 *Sedang mengambil screenshot...*", { parse_mode: "Markdown" });
    bot.sendChatAction(chatId, "upload_photo");

    try {
      const result = await apiService.takeScreenshot(url);
      
      const fileUrl = `${config.api.pythonUrl}/files/${result.filename}`;
      
      await bot.sendPhoto(chatId, fileUrl, {
        caption: `📸 Screenshot dari: ${url}\n✅ Berhasil diambil!`
      });

      await bot.deleteMessage(chatId, statusMsg.message_id);
    } catch (err) {
      console.error("Screenshot Error:", err.message);
      await bot.editMessageText(`❌ *Gagal:* ${err.message}`, {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: "Markdown"
      });
    }
  }
};

module.exports = screenshotHandler;
