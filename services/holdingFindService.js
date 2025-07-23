const pool = require("../common/database");
const { getHoldingFindDao } = require("../dao/holdingFindDao");

const getHoldingFindService = async (
  query,
  sort,
  assetClass,
  theme,
  isFavorite,
  userId
) => {
  const connection = await pool.connect();
  try {
    const holdings = await getHoldingFindDao(
      connection,
      query,
      sort,
      assetClass,
      theme,
      isFavorite,
      userId
    );
    return holdings;
  } finally {
    connection.release();
  }
};

module.exports = { getHoldingFindService };
