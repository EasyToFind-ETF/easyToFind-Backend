const { getTTRDao } = require("../dao/getTestThemeResultDao");
const pool = require("../common/database");

const getTestThemeResultService = {
  getTTRService: async (returnRate, liquidity, trackingError, aum, theme) => {
    const client = await pool.connect();
    try {
      const result = await getTTRDao(
        client,
        returnRate,
        liquidity,
        trackingError,
        aum,
        theme
      );
      if (result.length === 0) {
        throw new Error("No test theme results found");
      }
      return result;
    } finally {
      client.release(); // 반드시 release로 반납!
    }
  },
};

module.exports = getTestThemeResultService;
