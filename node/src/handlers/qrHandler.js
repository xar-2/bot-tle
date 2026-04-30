const apiService = require("../services/apiService");
const config = require("../../config/config");

const qrHandler = {
  handle: async (bot, msg, text) => {
    const chatId = msg.chat.id;

    if (!text) {
      return bot.sendMessage(chatId, "❌ Silakan masukkan teks atau link! Contoh: `/qr https://google.com` atau `/qr Halo Dunia` ", { parse_mode: "Markdown" });
    }

    const statusMsg = await bot.sendMessage(chatId, "⏳ *Sedang membuat QR Code...*", { parse_mode: "Markdown" });
    bot.sendChatAction(chatId, "upload_photo");

    try {
      const result = await apiService.generateQR(text);
      
      const fileUrl = `${config.api.pythonUrl}/files/${result.filename}`;
      
      await bot.sendPhoto(chatId, fileUrl, {
        caption: `✅ *QR Code Berhasil Dibuat!*\n\n📝 Data: \`${text}\``,
        parse_mode: "Markdown"
      });

      await bot.deleteMessage(chatId, statusMsg.message_id);
    } catch (err) {
      console.error("QR Handler Error:", err.message);
      await bot.editMessageText(`❌ *Gagal:* ${err.message}`, {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: "Markdown"
      });
    }
  }
};

module.exports = qrHandler;
