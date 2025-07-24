const { getMainTrendDao } = require("../dao/getMainTrendDao");
const pool = require("../common/database");

const getMainTrendService = {
  getAumService: async () => {
    const client = await pool.connect();
    try {
      const result = await getMainTrendDao.getAumDao(client);
      return result;
    } catch (error) {
      console.error("Error in getAumService:", error);
      throw error;
    } finally {
      client.release();
    }
  },
  getFlucService: async () => {
    const client = await pool.connect();
    try {
      const result = await getMainTrendDao.getFlucDao(client);
      return result;
    } catch (error) {
      console.error("Error in getFlucService:", error);
      throw error;
    } finally {
      client.release();
    }
  },
  getVolumeService: async () => {
    const client = await pool.connect();
    try {
      const result = await getMainTrendDao.getVolumeDao(client);
      return result;
    } catch (error) {
      console.error("Error in getVolumeService:", error);
      throw error;
    } finally {
      client.release();
    }
  },
};

module.exports = { getMainTrendService };