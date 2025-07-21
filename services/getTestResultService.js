const { getTRDao } = require("../dao/getTestResultDao");
const pool = require("../common/database");

const getTestResultService = {
  getTRService: async (returnRate, liquidity, trackingError, aum) => {
    const client = await pool.connect();
    try {
      const result = await getTRDao(
        client,
        returnRate,
        liquidity,
        trackingError,
        aum
      );
      if (result.length === 0) {
        throw new Error("No test results found");
      }
      return result;
    } finally {
      client.release(); // 반드시 release로 반납!
    }
  },
};

module.exports = getTestResultService;
