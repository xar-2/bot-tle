require("dotenv").config({ path: "../.env" });

module.exports = {
  bot: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    adminIds: (process.env.ADMIN_IDS || "").split(",").map(id => parseInt(id.trim())),
    privateOnly: process.env.PRIVATE_ONLY === "true" || false
  },
  api: {
    pythonUrl: process.env.PYTHON_API_URL || "http://localhost:8000",
    internalToken: process.env.INTERNAL_API_TOKEN || "bot-tle-secret-key-123"
  },
  db: {
    path: "../database/bot.db"
  }
};
