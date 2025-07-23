const { getTTRDao } = require("../dao/getTestThemeResultDao");
const pool = require("../common/database");

const getTestThemeResultService = {
  getTTRService: async (
    stabilityScore,
    liquidityScore,
    growthScore,
    divScore,
    theme
  ) => {
    const client = await pool.connect();
    try {
      const result = await getTTRDao(
        client,
        stabilityScore,
        liquidityScore,
        growthScore,
        divScore,
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
