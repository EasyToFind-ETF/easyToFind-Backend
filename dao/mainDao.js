const mainDao = {
  selectEtfs: async (connection) => {
    const query = `SELECT * FROM etfs`;
    const selectedRow = await connection.query(query);
    return selectedRow.rows;
  },
};

module.exports = mainDao;
