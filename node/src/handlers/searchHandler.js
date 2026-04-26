const apiService = require("../services/apiService");
const dbService = require("../services/dbService");

const searchHandler = {
  handle: async (bot, msg, text) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Show typing status
    bot.sendChatAction(chatId, "typing");

    try {
      const response = await apiService.searchWeb(text, userId);

      // Save to history just for stats if needed
      dbService.saveChatHistory(userId, "user", text);
      dbService.incrementStat(userId, "messages");

      await bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
    } catch (err) {
      await bot.sendMessage(chatId, `❌ *Error:* ${err.message}`, { parse_mode: "Markdown" });
    }
  }
};

module.exports = searchHandler;
