const gameHandler = {
  sendMenu: async (bot, msg) => {
    const opts = {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🪨 Batu", callback_data: "game_suit|batu" },
            { text: "✂️ Gunting", callback_data: "game_suit|gunting" },
            { text: "📄 Kertas", callback_data: "game_suit|kertas" }
          ],
          [{ text: "❌ Keluar", callback_data: "cancel" }]
        ]
      }
    };
    await bot.sendMessage(msg.chat.id, "🎮 *Game Suit (Gunting Batu Kertas)*\n\nPilih jagoanmu di bawah ini!", opts);
  },

  handleSuit: async (bot, query) => {
    const choices = ["batu", "gunting", "kertas"];
    const emojis = { batu: "🪨", gunting: "✂️", kertas: "📄" };
    const userChoice = query.data.split("|")[1];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];

    let result = "";
    if (userChoice === botChoice) {
      result = "🤝 *SERI!* Kita sama-sama kuat.";
    } else if (
      (userChoice === "batu" && botChoice === "gunting") ||
      (userChoice === "gunting" && botChoice === "kertas") ||
      (userChoice === "kertas" && botChoice === "batu")
    ) {
      result = "🎉 *KAMU MENANG!* Kamu hebat sekali.";
    } else {
      result = "😜 *KAMU KALAH!* Coba lagi ya.";
    }

    const text = `🎮 *HASIL GAME SUIT*\n\n` +
                 `👤 Kamu: ${emojis[userChoice]} *${userChoice.toUpperCase()}*\n` +
                 `🤖 Bot: ${emojis[botChoice]} *${botChoice.toUpperCase()}*\n\n` +
                 `${result}`;

    const opts = {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Main Lagi", callback_data: "game_menu" }],
          [{ text: "❌ Selesai", callback_data: "cancel" }]
        ]
      }
    };

    await bot.editMessageText(text, opts);
  }
};

module.exports = gameHandler;
