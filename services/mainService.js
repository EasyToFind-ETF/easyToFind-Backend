const pool = require("../common/database");
const { selectEtfs } = require("../dao/mainDao");

const mainService = {
  getEtfs: async () => {
    const client = await pool.connect();
    try {
      const result = await selectEtfs(client);
      return result;
    } finally {
      client.release(); // 반드시 release로 반납!
    }
  },
};

module.exports = mainService;
