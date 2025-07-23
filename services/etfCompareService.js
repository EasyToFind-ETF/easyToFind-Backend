const pool = require("../common/database");
const { getEtfOneDao } = require("../dao/etfCompareDao");

const getEtfOneService = async (etfCode, userId) => {
  const connection = await pool.connect();
  try {
    const result = await getEtfOneDao(connection, etfCode, userId);
    return result;
  } finally {
    connection.release();
  }
};

module.exports = { getEtfOneService };
