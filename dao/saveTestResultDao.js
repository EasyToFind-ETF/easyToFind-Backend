const saveTestResultDao = {
  saveTRDao: async (
    connection,
    userId,
    mbtiType,
    stabilityWeight,
    liquidityWeight,
    growthWeight,
    divWeight
  ) => {
    const query = `
      UPDATE users SET
        mbti_type = $1,
        stability_weight = $2,
        liquidity_weight = $3,
        growth_weight = $4,
        diversification_weight = $5
      WHERE user_id = $6;
    `;

    console.log(
      "saveDao",
      mbtiType,
      stabilityWeight,
      liquidityWeight,
      growthWeight,
      divWeight,
      userId
    );

    const result = await connection.query(query, [
      mbtiType,
      stabilityWeight,
      liquidityWeight,
      growthWeight,
      divWeight,
      userId,
    ]);

    return result.rows;
  },
};
module.exports = saveTestResultDao;
