const { saveTRDao } = require("../dao/saveTestResultDao");
const pool = require("../common/database");

const saveTestResultService = {
  saveTRService: async (
    userId,
    mbtiType,
    stabilityScore,
    liquidityScore,
    growthScore,
    divScore
  ) => {
    const client = await pool.connect();
    try {
      const result = await saveTRDao(
        client,
        userId,
        mbtiType,
        stabilityScore,
        liquidityScore,
        growthScore,
        divScore
      );
      if (result.rowCount === 0) {
        throw new Error("Failed to save test result");
      }
      return result;
    } finally {
      client.release(); // 반드시 release로 반납!
    }
  },
};

module.exports = saveTestResultService;
