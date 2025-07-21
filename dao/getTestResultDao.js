const getTestResultDao = {
  getTRDao: async (connection, riskScore) => {
    const query = `WITH params AS (
  SELECT  ($1 / 35.0)*100 AS user_score
),
matched AS (
  SELECT
    ers.etf_code,
    ers.etf_score,
    ers.stability_risk_score,
    100 - ABS(p.user_score - ers.stability_risk_score) AS risk_match_score
  FROM etf_recommendation_score ers, params p
),
ranked AS (
  SELECT
    etf_code,
    etf_score,
    stability_risk_score,
    risk_match_score,
    ROUND((0.7 * risk_match_score + 0.3 * etf_score)::numeric, 2) AS final_score
  FROM matched
)
SELECT *
FROM ranked
ORDER BY final_score DESC
LIMIT 5;

`;

    console.log("riskscore", riskScore);
    const result = await connection.query(query, [riskScore]);
    return result.rows;
  },
};

module.exports = getTestResultDao;
