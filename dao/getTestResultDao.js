const getTestResultDao = {
  getTRDao: async (
    connection,
    stabilityScore,
    liquidityScore,
    growthScore,
    divScore
  ) => {
    const query = `
    WITH normalized_weights AS (
  SELECT
    $1::numeric AS w1_raw,  -- stability
    $2::numeric AS w2_raw,  -- liquidity
    $3::numeric AS w3_raw,  -- growth
    $4::numeric AS w4_raw   -- diversification
),
weight_sum AS (
  SELECT
    w1_raw + w2_raw + w3_raw + w4_raw AS total
  FROM normalized_weights
),
user_weights AS (
  SELECT
    w1_raw / total AS w1,
    w2_raw / total AS w2,
    w3_raw / total AS w3,
    w4_raw / total AS w4
  FROM normalized_weights, weight_sum
),
scored_etfs AS (
  SELECT
    ers.etf_code,
    e.etf_name,
    ers.stability_score,
    ers.liquidity_score,
    ers.growth_score,
    ers.diversification_score,
    
    ROUND((
      ers.stability_score * uw.w1 +
      ers.liquidity_score * uw.w2 +
      ers.growth_score * uw.w3 +
      ers.diversification_score * uw.w4
    )::numeric, 2) AS total_score
  FROM etf_recommendation_score ers
  JOIN etfs e ON ers.etf_code = e.etf_code
  CROSS JOIN user_weights uw
  WHERE
    ers.stability_score IS NOT NULL AND
    ers.liquidity_score IS NOT NULL AND
    ers.growth_score IS NOT NULL AND
    ers.diversification_score IS NOT NULL
)
SELECT *
FROM scored_etfs
ORDER BY total_score DESC
LIMIT 5;

`;

    const result = await connection.query(query, [
      stabilityScore,
      liquidityScore,
      growthScore,
      divScore,
    ]);
    return result.rows;
  },
};

module.exports = getTestResultDao;
