const pool = require("../common/database");
const { insertFavorite, deleteFavorite } = require("../dao/etfFavoriteDao");

const etfFavoriteService = {
  addFavorite: async (user_id, etf_code) => {
    const client = await pool.connect();
    try {
      await insertFavorite(client, user_id, etf_code);
    } finally {
      client.release();
    }
  },

  removeFavorite: async (user_id, etf_code) => {
    const client = await pool.connect();
    try {
      await deleteFavorite(client, user_id, etf_code);
    } finally {
      client.release();
    }
  },
};

const getFavoritesByUserId = async (user_id) => {
  const query = `SELECT etf_code FROM user_favorites WHERE user_id = $1`;
  const result = await pool.query(query, [user_id]); // ← 여기서 db → pool
  return result.rows.map((row) => row.etf_code); // [ "104520", "123456", ... ]
};

module.exports = { etfFavoriteService, getFavoritesByUserId };
