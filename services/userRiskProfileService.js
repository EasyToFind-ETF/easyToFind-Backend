const pool = require("../common/database");
const { getUserRiskProfileDao } = require("../dao/userRiskProfileDao");

const getUserRiskProfileService = async (userId) => {
  const connection = await pool.connect();
  try {
    const riskScore = await getUserRiskProfileDao(connection, userId);
    l;
    return riskScore;
  } finally {
    connection.release();
  }
};

module.exports = { getUserRiskProfileService };
