const TelegramBot = require("node-telegram-bot-api");
const config = require("../config/config");
const dbService = require("./services/dbService");
const searchHandler = require("./handlers/searchHandler");
const downloadHandler = require("./handlers/downloadHandler");
const adminHandler = require("./handlers/adminHandler");
const screenshotHandler = require("./handlers/screenshotHandler");
const qrHandler = require("./handlers/qrHandler");
const chalk = require("chalk");

const apiService = require("./services/apiService");

console.log(chalk.yellow("⏳ Menunggu Mesin Python (AI & Downloader) siap..."));

const startBot = () => {
  // Initialize Bot only after Python is ready
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
                  `🔍 *Web Search*: Ketik kata kunci untuk mencari di internet.\n` +
                  `📸 *Screenshot*: Ketik \`/ss [url]\` untuk foto website.\n` +
                  `🖼 *QR Generator*: Ketik \`/qr [teks/link]\`.\n` +
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
               `• *Web Search*: Cukup ketik kata kunci yang ingin dicari.\n` +
               `• *Screenshot*: \`/ss link-website\`.\n` +
               `• *QR Code*: \`/qr teks atau link\`.\n` +
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

bot.onText(/\/ss\s*(.*)/, (msg, match) => {
  screenshotHandler.handle(bot, msg, match[1]);
});

bot.onText(/\/qr\s*(.*)/, (msg, match) => {
  qrHandler.handle(bot, msg, match[1]);
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
  } else if (query.data.startsWith("admin_")) {
    // Security check for callback admin
    if (!config.bot.adminIds.includes(query.from.id)) {
      return bot.answerCallbackQuery(query.id, { text: "🚫 Akses Ditolak", show_alert: true });
    }

    const action = query.data.replace("admin_", "");
    
    if (action === "refresh") {
      bot.answerCallbackQuery(query.id, { text: "🔄 Memperbarui data..." });
      bot.deleteMessage(query.message.chat.id, query.message.message_id);
      adminHandler.handleStats(bot, query.message);
    } else if (action === "users") {
      bot.answerCallbackQuery(query.id);
      adminHandler.handleListUsers(bot, query.message);
    } else if (action === "backup") {
      bot.answerCallbackQuery(query.id, { text: "💾 Menyiapkan backup..." });
      adminHandler.handleBackup(bot, query.message);
    } else if (action === "bc") {
      bot.answerCallbackQuery(query.id);
      bot.sendMessage(query.message.chat.id, "📢 *Mode Broadcast*\n\nSilakan ketik perintah `/broadcast [pesan]` untuk mulai mengirim pesan.", { parse_mode: "Markdown" });
    }
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
  } else {
    searchHandler.handle(bot, msg, text);
  }
});

  // ─── Error Handling ───────────────────────────────────────────
  bot.on("polling_error", (err) => console.error(chalk.red("Polling Error:"), err.message));
};

// Polling until Python API is ready
const checkPythonAPI = async () => {
  let attempts = 0;
  const maxAttempts = 30; // Tunggu maksimal 60 detik (30 * 2 detik)
  
  const interval = setInterval(async () => {
    attempts++;
    const status = await apiService.ping();
    if (status && status.status === "ok") {
      clearInterval(interval);
      console.log(chalk.green("✅ Mesin Python terhubung!"));
      startBot();
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
      console.error(chalk.red("❌ Gagal terhubung ke Mesin Python setelah 60 detik. Memulai bot dengan fitur terbatas..."));
      startBot();
    }
  }, 2000);
};

checkPythonAPI();

process.on("unhandledRejection", (reason) => console.error(chalk.red("Unhandled Rejection:"), reason));
