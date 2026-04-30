const axios = require("axios");
const config = require("../../config/config");

const api = axios.create({
  baseURL: config.api.pythonUrl,
  headers: {
    "X-API-KEY": config.api.internalToken
  }
});

const apiService = {
  ping: async () => {
    try {
      const res = await api.get("/ping");
      return res.data;
    } catch (err) {
      console.error("API Ping Error:", err.message || err);
      return null;
    }
  },

  searchWeb: async (query, userId) => {
    try {
      const res = await api.post("/search/", { query, user_id: String(userId) });
      return res.data.response;
    } catch (err) {
      console.error("Web Search API Error:", err.message);
      throw new Error(`Gagal menghubungi mesin pencari: ${err.message}`);
    }
  },

  getDownloadInfo: async (url) => {
    try {
      const res = await api.get("/download/info", { params: { url } });
      return res.data;
    } catch (err) {
      console.error("Download Info Error:", err.message);
      throw new Error(`Gagal mengambil informasi media: ${err.message}`);
    }
  },

  executeDownload: async (url, type, quality, userId) => {
    try {
      const res = await api.post("/download/execute", { url, type, quality, user_id: String(userId) });
      return res.data;
    } catch (err) {
      console.error("Download Execute Error:", err.message);
      const detail = err.response?.data?.detail || err.message;
      throw new Error(`Gagal memproses download: ${detail}`);
    }
  },

  getPhotos: async (url, userId) => {
    try {
      const res = await api.get("/download/photos", { params: { url, user_id: String(userId) } });
      return res.data.photos;
    } catch (err) {
      console.error("Get Photos Error:", err.message);
      throw new Error("Gagal mengambil foto.");
    }
  },

  cancelDownload: async (userId) => {
    try {
      await api.post("/download/cancel", { url: "", user_id: String(userId) });
      return true;
    } catch (err) {
      console.error("Cancel Download Error:", err.message);
      return false;
    }
  },

  takeScreenshot: async (url) => {
    try {
      const res = await api.get("/screenshot", { params: { url } });
      return res.data;
    } catch (err) {
      console.error("Screenshot API Error:", err.message);
      const detail = err.response?.data?.detail || err.message;
      throw new Error(detail);
    }
  },

  generateQR: async (data) => {
    try {
      const res = await api.get("/qr/generate", { params: { data } });
      return res.data;
    } catch (err) {
      console.error("QR API Error:", err.message);
      const detail = err.response?.data?.detail || err.message;
      throw new Error(detail);
    }
  },

  readNovel: async (url) => {
    try {
      const res = await api.get("/novel/read", { params: { url } });
      return res.data;
    } catch (err) {
      console.error("Read Novel API Error:", err.message);
      const detail = err.response?.data?.detail || err.message;
      throw new Error(detail);
    }
  }
};

module.exports = apiService;
