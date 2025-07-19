const { getTRDao } = require("../dao/getTestResultDao");
const pool = require("../common/database");

const getTestResultService = {
  getTRService: async (riskScore) => {
    const client = await pool.connect();
    try {
      const result = await getTRDao(client, riskScore);
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
