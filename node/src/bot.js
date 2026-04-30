const TelegramBot = require("node-telegram-bot-api");
const config = require("../config/config");
const dbService = require("./services/dbService");
const searchHandler = require("./handlers/searchHandler");
const downloadHandler = require("./handlers/downloadHandler");
const adminHandler = require("./handlers/adminHandler");
const screenshotHandler = require("./handlers/screenshotHandler");
const qrHandler = require("./handlers/qrHandler");
const gameHandler = require("./handlers/gameHandler");
const mangaHandler = require("./handlers/mangaHandler");
const novelHandler = require("./handlers/novelHandler");
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
  dbService.trackUser(msg.from.id, msg.from.username);
  
  const welcome = `👋 *Selamat Datang di Bot\-tle\!*\n\n` +
                  `🚀 *Visi & Misi:*\n` +
                  `Menjadi asisten digital pendamping harianmu yang cepat, simpel, dan serbaguna\.\n\n` +
                  `📖 *Cara Menggunakan Bot:*\n` +
                  `1️⃣ *Pencarian* \- Ketik apa saja untuk cari di internet\.\n` +
                  `2️⃣ *Download* \- Kirim link YouTube/IG/TikTok\.\n` +
                  `3️⃣ *Screenshot* \- /ss \[link\] untuk foto website\.\n` +
                  `4️⃣ *QR Code* \- /qr \[teks/link\] untuk barcode\.\n` +
                  `5️⃣ *Manga* \- /manga \[judul\] untuk info manga\.\n` +
                  `6️⃣ *Novel* \- /novel \[judul\] untuk info & baca novel\.\n\n` +
                  `Pilih menu di bawah atau langsung kirim pesan\!`;
  
  // Kirim pesan sambutan dengan Reply Keyboard
  bot.sendMessage(msg.chat.id, welcome, { 
    parse_mode: "MarkdownV2",
    reply_markup: {
      keyboard: [["📊 Stats", "❓ Help", "🎮 Game"], ["🔍 Cari di Web", "📥 Download"], ["📚 Manga", "📖 Novel"]],
      resize_keyboard: true
    }
  });

  // Kirim tombol Hubungi Admin secara terpisah (inline_keyboard)
  bot.sendMessage(msg.chat.id, "💬 Ada pertanyaan atau kendala? Hubungi Admin kami:", {
    reply_markup: {
      inline_keyboard: [[{ text: "👨‍💻 Hubungi Admin", callback_data: "contact_admin" }]]
    }
  });
});

bot.onText(/\/report\s*(.*)/, (msg, match) => {
  const userId = msg.from.id;
  const text = match[1];
  
  if (!text) {
    return bot.sendMessage(msg.chat.id, "❌ Silakan masukkan pesan! Contoh: `/report Ada kendala download`", { parse_mode: "Markdown" });
  }

  // Kirim ke semua Admin
  config.bot.adminIds.forEach(adminId => {
    bot.sendMessage(adminId, `📨 *PESAN BARU DARI USER*\n\n👤 Dari: ${msg.from.first_name}\n🆔 ID: \`${userId}\`\n💬 Pesan: ${text}\n\n_Gunakan /reply ${userId} [pesan] untuk membalas_`, { parse_mode: "Markdown" });
  });

  bot.sendMessage(msg.chat.id, "✅ *Pesan telah dikirim ke Admin.* Mohon tunggu balasan ya!", { parse_mode: "Markdown" });
});

bot.onText(/\/reply\s+(\d+)\s+(.*)/, (msg, match) => {
  if (!config.bot.adminIds.includes(msg.from.id)) return;
  
  const targetId = match[1];
  const replyText = match[2];

  bot.sendMessage(targetId, `📩 *PESAN DARI ADMIN:*\n\n${replyText}`, { parse_mode: "Markdown" });
  bot.sendMessage(msg.chat.id, `✅ Balasan terkirim ke \`${targetId}\``);
});

bot.onText(/\/game/, (msg) => {
  gameHandler.sendMenu(bot, msg);
});

bot.onText(/\/manga\s*(.*)/, (msg, match) => {
  mangaHandler.handleSearch(bot, msg, match[1]);
});

bot.onText(/\/novel\s*(.*)/, (msg, match) => {
  novelHandler.handleSearch(bot, msg, match[1]);
});

// ─── Command: /help ───────────────────────────────────────────
bot.onText(/\/help|❓ Help/, (msg) => {
  const help = `📖 *Panduan Bot-tle*\n\n` +
               `• *Web Search*: Cukup ketik kata kunci yang ingin dicari.\n` +
               `• *Screenshot*: \`/ss link-website\`.\n` +
               `• *QR Code*: \`/qr teks atau link\`.\n` +
               `• *Manga*: \`/manga judul manga\`.\n` +
               `• *Novel*: \`/novel judul novel\`.\n` +
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
  } else if (query.data === "contact_admin") {
    bot.answerCallbackQuery(query.id);
    bot.sendMessage(query.message.chat.id, "👨‍💻 *Hubungi Admin*\n\nSilakan gunakan perintah:\n`/report [pesan kamu]`\n\nContoh: `/report Halo admin, saya ada kendala download`", { parse_mode: "Markdown" });
  } else if (query.data.startsWith("game_")) {
    if (query.data === "game_menu") {
      bot.answerCallbackQuery(query.id);
      bot.deleteMessage(query.message.chat.id, query.message.message_id);
      gameHandler.sendMenu(bot, query.message);
    } else {
      bot.answerCallbackQuery(query.id);
      gameHandler.handleSuit(bot, query);
    }
  } else if (query.data.startsWith("read_novel|")) {
    novelHandler.handleText(bot, query);
  } else if (query.data.startsWith("novel_page|")) {
    novelHandler.handlePage(bot, query);
  } else if (query.data === "noop") {
    bot.answerCallbackQuery(query.id); // Tombol info halaman, tidak melakukan apa-apa
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
  if (text === "📊 Stats" || text === "❓ Help" || text === "🎮 Game" || text === "📚 Manga" || text === "📖 Novel") {
    if (text === "🎮 Game") return gameHandler.sendMenu(bot, msg);
    if (text === "📚 Manga") return bot.sendMessage(chatId, "📚 Silahkan ketikkan `/manga [judul]` untuk mencari informasi Manga!");
    if (text === "📖 Novel") return bot.sendMessage(chatId, "📖 Silahkan ketikkan `/novel [judul]` untuk mencari informasi Novel!");
    return;
  }
  
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
