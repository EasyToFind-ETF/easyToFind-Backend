const pool = require("../common/database");
const { getEtfFindDao } = require("../dao/etfFindDao");

const getEtfFindService = async (
  query,
  sort,
  assetClass,
  theme,
  isFavorite,
  userId
) => {
  const connection = await pool.connect();
  try {
    const etfs = await getEtfFindDao(
      connection,
      query,
      sort,
      assetClass,
      theme,
      isFavorite,
      userId
    );
    return etfs;
  } finally {
    connection.release();
  }
};

module.exports = { getEtfFindService };
