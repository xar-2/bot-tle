const dbService = require("../services/dbService");
const config = require("../../config/config");
const os = require("os");
const path = require("path");
const fs = require("fs");

const adminHandler = {
  handleStats: async (bot, msg) => {
    const stats = dbService.getTotalStats();
    const uptime = process.uptime();
    const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);

    const report = `👑 *Panel Admin*\n\n` +
                   `📊 *Statistik*\n` +
                   `👥 Total Users: ${stats.users}\n` +
                   `📥 Total Downloads: ${stats.downloads}\n` +
                   `💬 Total AI Messages: ${stats.messages}\n\n` +
                   `💻 *Sistem*\n` +
                   `⏱ Uptime: ${h}h ${m}m ${s}s\n` +
                   `💾 RAM: ${mem} MB\n` +
                   `🐧 OS: ${os.platform()} ${os.release()}\n\n` +
                   `📢 *Commands Admin:*\n` +
                   `• \`/broadcast [pesan]\` - Kirim pesan ke semua\n` +
                   `• \`/users\` - Lihat daftar user terbaru & ID\n` +
                   `• \`/ban [id]\` - Blokir pengguna\n` +
                   `• \`/unban [id]\` - Buka blokir pengguna\n` +
                   `• \`/backup\` - Ambil backup database bot`;

    await bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
  },

  handleBroadcast: async (bot, msg, text) => {
    if (!text) return bot.sendMessage(msg.chat.id, "❌ Masukkan pesan: `/broadcast Halo semuanya!`", { parse_mode: "Markdown" });

    const users = dbService.getAllUsers();
    let success = 0;
    let fail = 0;

    const statusMsg = await bot.sendMessage(msg.chat.id, `🚀 Memulai broadcast ke ${users.length} user...`);

    for (const user of users) {
      try {
        await bot.sendMessage(user.id, text, { parse_mode: "Markdown" });
        success++;
      } catch (err) {
        fail++;
      }
      // Delay sedikit agar tidak terkena rate limit Telegram
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    await bot.editMessageText(`✅ *Broadcast Selesai*\n\n Terkirim: ${success}\n Gagal: ${fail} (Bot diblokir)`, {
      chat_id: msg.chat.id,
      message_id: statusMsg.message_id,
      parse_mode: "Markdown"
    });
  },

  handleBan: async (bot, msg, targetId) => {
    if (!targetId) return bot.sendMessage(msg.chat.id, "❌ Masukkan ID user: `/ban 123456`", { parse_mode: "Markdown" });
    dbService.banUser(targetId);
    await bot.sendMessage(msg.chat.id, `🚫 *User ${targetId} telah diblokir.*`, { parse_mode: "Markdown" });
  },

  handleUnban: async (bot, msg, targetId) => {
    if (!targetId) return bot.sendMessage(msg.chat.id, "❌ Masukkan ID user: `/unban 123456`", { parse_mode: "Markdown" });
    dbService.unbanUser(targetId);
    await bot.sendMessage(msg.chat.id, `✅ *Blokir User ${targetId} telah dibuka.*`, { parse_mode: "Markdown" });
  },

  handleBackup: async (bot, msg) => {
    const dbPath = path.resolve(__dirname, "../../database/bot.db");
    if (fs.existsSync(dbPath)) {
      await bot.sendDocument(msg.chat.id, dbPath, { caption: "💾 *Backup Database Bot-tle*", parse_mode: "Markdown" });
    } else {
      await bot.sendMessage(msg.chat.id, "❌ Database tidak ditemukan.");
    }
  },

  handleListUsers: async (bot, msg) => {
    const users = dbService.getRecentUsers(20);
    if (users.length === 0) return bot.sendMessage(msg.chat.id, "Belum ada user terdaftar.");

    let text = "👥 <b>Daftar 20 User Terbaru:</b>\n\n";
    users.forEach((u, i) => {
      const username = u.username ? `@${u.username}` : "no_user";
      // Escape HTML special chars just in case
      const safeUsername = username.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      text += `${i + 1}. ${safeUsername} - <code>${u.id}</code>\n`;
    });
    text += "\n<i>Gunakan ID di atas untuk melakukan /ban atau /unban</i>";

    await bot.sendMessage(msg.chat.id, text, { parse_mode: "HTML" });
  }
};

module.exports = adminHandler;
