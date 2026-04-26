const db = require("../../../database/db");

const dbService = {
  trackUser: (userId, username) => {
    const existing = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
    const upsert = db.prepare(`
      INSERT INTO users (id, username) VALUES (?, ?)
      ON CONFLICT(id) DO UPDATE SET username = excluded.username
    `);
    upsert.run(userId, username);
    return !existing;
  },

  incrementStat: (userId, field) => {
    if (!["downloads", "messages"].includes(field)) return;
    const stmt = db.prepare(`UPDATE users SET ${field} = ${field} + 1 WHERE id = ?`);
    stmt.run(userId);
  },

  getUserStats: (userId) => {
    return db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  },

  saveChatHistory: (userId, role, content) => {
    const stmt = db.prepare("INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)");
    stmt.run(userId, role, content);
  },

  getChatHistory: (userId, limit = 10) => {
    return db.prepare("SELECT role, content FROM chat_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?")
      .all(userId, limit)
      .reverse();
  },

  clearChatHistory: (userId) => {
    db.prepare("DELETE FROM chat_history WHERE user_id = ?").run(userId);
  },

  getTotalStats: () => {
    return {
      users: db.prepare("SELECT COUNT(*) as count FROM users").get().count,
      downloads: db.prepare("SELECT SUM(downloads) as count FROM users").get().count || 0,
      messages: db.prepare("SELECT SUM(messages) as count FROM users").get().count || 0
    };
  },

  getAllUsers: () => {
    return db.prepare("SELECT id FROM users").all();
  },

  banUser: (userId) => {
    db.prepare("UPDATE users SET is_banned = 1 WHERE id = ?").run(userId);
  },

  unbanUser: (userId) => {
    db.prepare("UPDATE users SET is_banned = 0 WHERE id = ?").run(userId);
  },

  isBanned: (userId) => {
    const user = db.prepare("SELECT is_banned FROM users WHERE id = ?").get(userId);
    return user ? user.is_banned === 1 : false;
  },

  getRecentUsers: (limit = 10) => {
    return db.prepare("SELECT id, username, joined_at FROM users ORDER BY joined_at DESC LIMIT ?").all(limit);
  }
};

module.exports = dbService;
