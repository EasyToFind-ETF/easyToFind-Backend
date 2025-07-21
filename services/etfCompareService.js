const pool = require("../common/database");
const { getEtfOneDao } = require("../dao/etfCompareDao");

const getEtfOneService = async (etfCode) => {
  const connection = await pool.connect();
  try {
    const result = await getEtfOneDao(connection, etfCode);
    return result;
  } finally {
    connection.release();
  }
};

module.exports = { getEtfOneService };
