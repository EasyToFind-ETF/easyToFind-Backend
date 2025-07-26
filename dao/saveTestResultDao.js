const saveTestResultDao = {
  saveTRDao: async (
    connection,
    userId,
    mbtiType,
    stabilityScore,
    liquidityScore,
    growthScore,
    divScore
  ) => {
    const query = `
     UPDATE users SET
  mbti_type = $1,
  stability_weight = $2,
  liquidity_weight = $3,
  growth_weight = $4,
  diversification_weight = $5,
  updated_at = NOW()
WHERE user_id = $6;

    `;

    console.log(
      "saveDao",
      mbtiType,
      stabilityScore,
      liquidityScore,
      growthScore,
      divScore,
      userId
    );

    const result = await connection.query(query, [
      mbtiType,
      stabilityScore,
      liquidityScore,
      growthScore,
      divScore,
      userId,
    ]);

    return result.rows;
  },
};
module.exports = saveTestResultDao;
