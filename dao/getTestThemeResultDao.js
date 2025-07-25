const getTestThemeResultDao = {
  getTTRDao: async (
    connection,
    stabilityScore,
    liquidityScore,
    growthScore,
    divScore,
    theme
  ) => {
    const query = `
 WITH raw_score AS (
  SELECT
    ers.etf_code,
    e.etf_name,
    ers.stability_score,
    ers.liquidity_score,
    ers.growth_score,
    ers.diversification_score,
   ROUND((
  (
    ers.stability_score * $1 +
    ers.liquidity_score * $2 +
    ers.growth_score * $3 +
    ers.diversification_score * $4
  ) / ($1 + $2 + $3 + $4)
)::numeric, 2) AS total_score

  FROM etf_recommendation_score ers
  JOIN etfs e ON ers.etf_code = e.etf_code
  WHERE ers.stability_score IS NOT NULL
    AND ers.liquidity_score IS NOT NULL
    AND ers.growth_score IS NOT NULL
    AND ers.diversification_score IS NOT NULL
    AND e.theme = $5
)
SELECT *
FROM raw_score
ORDER BY total_score DESC
LIMIT 5;
`;
    console.log(
      "ddd",
      stabilityScore,
      liquidityScore,
      growthScore,
      divScore,
      theme
    );
    const result = await connection.query(query, [
      stabilityScore,
      liquidityScore,
      growthScore,
      divScore,
      theme,
    ]);
    return result.rows;
  },
};
module.exports = getTestThemeResultDao;
