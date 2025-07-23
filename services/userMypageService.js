const pool = require("../common/database");
const { getUserInfoFromDB } = require("../dao/userMypageDao");

const getUserInfoById = async (user_id) => {
  const client = await pool.connect();
  try {
    return await getUserInfoFromDB(client, user_id);
  } finally {
    client.release();
  }
};

module.exports = { getUserInfoById };
