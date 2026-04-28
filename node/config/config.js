const path = require("path");
require("dotenv").config();

module.exports = {
  bot: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    adminIds: (process.env.ADMIN_IDS || "").split(",").map(id => parseInt(id.trim())),
    privateOnly: process.env.PRIVATE_ONLY === "true" || false
  },
  api: {
    // Use private networking if on Railway, or public URL if provided
    pythonUrl: process.env.PYTHON_API_URL || "http://localhost:8000",
    internalToken: process.env.INTERNAL_API_TOKEN || "bot-tle-secret-key-123"
  },
  db: {
    // Database path relative to the node folder
    path: process.env.DATABASE_PATH || path.join(__dirname, "../database/bot.db")
  }
};
