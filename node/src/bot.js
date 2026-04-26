const TelegramBot = require("node-telegram-bot-api");
const config = require("../config/config");
const dbService = require("./services/dbService");
const searchHandler = require("./handlers/searchHandler");
const downloadHandler = require("./handlers/downloadHandler");
const adminHandler = require("./handlers/adminHandler");
const chalk = require("chalk");

// Initialize Bot
const bot = new TelegramBot(config.bot.token, { polling: true });

console.log(chalk.green("🤖 Bot-tle is running..."));

// Anti-Spam Tracking
const userCooldowns = new Map();
const COOLDOWN_TIME = 2000; // 2 detik jeda antar pesan

// Helper: Check URL
const isURL = (text) => /https?:\/\/[^\s]+/.test(text);

// ─── Command: /start ──────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const name = msg.chat.first_name || "User";
  dbService.trackUser(msg.from.id, msg.from.username);
  
  const welcome = `👋 Halo *${name}*!\n\n` +
                  `Saya adalah *Bot-tle*, asisten multifungsi kamu.\n\n` +
                  `🎵 *Cari Musik*: Ketik \`play [judul]\` atau \`lagu [judul]\`.\n` +
                  `🔍 *Web Search*: Ketik kata kunci untuk mencari di internet.\n` +
                  `📥 *Downloader*: Kirim link YouTube/Instagram/TikTok.\n\n` +
                  `Gunakan /help untuk bantuan lebih lanjut.`;
  
  bot.sendMessage(msg.chat.id, welcome, { 
    parse_mode: "Markdown",
    reply_markup: {
      keyboard: [["📊 Stats", "❓ Help"], ["🔍 Cari di Web", "📥 Download"]],
      resize_keyboard: true
    }
  });
});

// ─── Command: /help ───────────────────────────────────────────
bot.onText(/\/help|❓ Help/, (msg) => {
  const help = `📖 *Panduan Bot-tle*\n\n` +
               `• *Cari Musik*: Ketik \`play judul lagu\` atau \`lagu judul lagu\`.\n` +
               `• *Web Search*: Cukup ketik kata kunci yang ingin dicari.\n` +
               `• *Download*: Paste link video/foto dari sosmed.\n` +
               `• /reset: Hapus riwayat pencarian kamu.\n` +
               `• /stats: Lihat statistik penggunaan kamu.\n\n` +
               `_Bot ini bersifat hybrid dan terus dikembangkan._`;
  bot.sendMessage(msg.chat.id, help, { parse_mode: "Markdown" });
});

// ─── Command: /reset ──────────────────────────────────────────
bot.onText(/\/reset/, (msg) => {
  dbService.clearChatHistory(msg.from.id);
  bot.sendMessage(msg.chat.id, "🗑 *Riwayat pencarian telah dihapus!*", { parse_mode: "Markdown" });
});

// ─── Command: /stats ──────────────────────────────────────────
bot.onText(/\/stats|📊 Stats/, (msg) => {
  const stats = dbService.getUserStats(msg.from.id);
  if (!stats) return bot.sendMessage(msg.chat.id, "Belum ada data.");
  
  const text = `📊 *Statistik Kamu*\n\n` +
               `📥 Download: *${stats.downloads}*\n` +
               `🔍 Pencarian: *${stats.messages}*\n` +
               `📅 Bergabung: ${new Date(stats.joined_at).toLocaleDateString("id-ID")}`;
  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

// ─── Admin Commands ───────────────────────────────────────────
bot.onText(/\/admin/, (msg) => {
  if (!config.bot.adminIds.includes(msg.from.id)) return;
  adminHandler.handleStats(bot, msg);
});

// ─── Broadcast Command ────────────────────────────────────────
bot.onText(/\/broadcast (.+)/, (msg, match) => {
  if (!config.bot.adminIds.includes(msg.from.id)) return;
  adminHandler.handleBroadcast(bot, msg, match[1]);
});

// ─── Ban/Unban/Backup Commands ────────────────────────────────
bot.onText(/\/ban (\d+)/, (msg, match) => {
  if (!config.bot.adminIds.includes(msg.from.id)) return;
  adminHandler.handleBan(bot, msg, match[1]);
});

bot.onText(/\/unban (\d+)/, (msg, match) => {
  if (!config.bot.adminIds.includes(msg.from.id)) return;
  adminHandler.handleUnban(bot, msg, match[1]);
});

bot.onText(/\/backup/, (msg) => {
  if (!config.bot.adminIds.includes(msg.from.id)) return;
  adminHandler.handleBackup(bot, msg);
});

bot.onText(/\/users/, (msg) => {
  if (!config.bot.adminIds.includes(msg.from.id)) return;
  adminHandler.handleListUsers(bot, msg);
});

// ─── Callback Queries ─────────────────────────────────────────
bot.on("callback_query", (query) => {
  if (query.data.startsWith("dl|")) {
    downloadHandler.execute(bot, query);
  } else if (query.data.startsWith("cancel_dl|")) {
    downloadHandler.handleCancel(bot, query);
  } else if (query.data === "cancel") {
    bot.answerCallbackQuery(query.id, { text: "Dibatalkan" });
    bot.deleteMessage(query.message.chat.id, query.message.message_id);
  }
});

// ─── Main Message Handler ─────────────────────────────────────
bot.on("message", (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;
  
  const text = msg.text.trim();
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const isNew = dbService.trackUser(userId, msg.from.username);
  
  // New User Notification to Admins
  if (isNew) {
    config.bot.adminIds.forEach(adminId => {
      bot.sendMessage(adminId, `🆕 *User Baru Bergabung!*\n\n👤 Name: ${msg.from.first_name}\n🆔 ID: \`${userId}\`\n🏷 Username: @${msg.from.username || "-"}`, { parse_mode: "Markdown" });
    });
  }

  // Anti-Ban Logic
  if (dbService.isBanned(userId)) {
    return; // Abaikan pesan dari user yang diblokir
  }

  // Anti-Spam Logic
  const now = Date.now();
  if (userCooldowns.has(userId)) {
    const lastTime = userCooldowns.get(userId);
    if (now - lastTime < COOLDOWN_TIME) {
      // Abaikan jika terlalu cepat, atau beri peringatan jika perlu
      return; 
    }
  }
  userCooldowns.set(userId, now);

  // Keyboard mapping (Handled by onText regex now)
  if (text === "📊 Stats" || text === "❓ Help") return;
  
  if (text === "🔍 Cari di Web") return bot.sendMessage(chatId, "🔍 Silahkan ketikkan kata kunci yang ingin dicari di internet!");
  if (text === "📥 Download") return bot.sendMessage(chatId, "🔗 Silahkan kirimkan link media!");

  // Logic: URL or Search or Music
  const lowerText = text.toLowerCase();
  
  if (isURL(text)) {
    downloadHandler.handleLink(bot, msg, text);
  } else if (lowerText.startsWith("play ") || lowerText.startsWith("lagu ")) {
    const query = text.replace(/^play /i, "").replace(/^lagu /i, "").trim();
    const searchUrl = `ytsearch1:${query}`;
    downloadHandler.handleLink(bot, msg, searchUrl);
  } else {
    searchHandler.handle(bot, msg, text);
  }
});

// ─── Error Handling ───────────────────────────────────────────
bot.on("polling_error", (err) => console.error(chalk.red("Polling Error:"), err.message));
process.on("unhandledRejection", (reason) => console.error(chalk.red("Unhandled Rejection:"), reason));
