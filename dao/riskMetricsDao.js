// dao/riskMetricsDao.js
const getRiskScoreMap = async (connection) => {
  const sql = `
      SELECT etf_code, stability_risk_score
      FROM etf_recommendation_score
      WHERE stability_risk_score IS NOT NULL
    `;

  const { rows } = await connection.query(sql);

  const riskMap = {};
  rows.forEach((row) => {
    riskMap[row.etf_code] = row.stability_risk_score;
  });

  return riskMap;
};

const getQuality = async (connection, etfCode) => {
  const sql = `
      WITH ranks AS (
        SELECT
          etf_code,
          1 - PERCENT_RANK() OVER (ORDER BY expense_ratio) AS cost_score,
          PERCENT_RANK() OVER (ORDER BY latest_aum) AS liquidity_score,
          COALESCE(etf_score, 50) / 100 AS premium_score -- 네이밍 변경
        FROM etf_recommendation_score
        WHERE expense_ratio IS NOT NULL 
          AND latest_aum IS NOT NULL
      )
      SELECT
        cost_score,
        liquidity_score,
        premium_score,
        (0.4 * cost_score + 0.35 * liquidity_score + 0.25 * premium_score) AS quality_total
      FROM ranks
      WHERE etf_code = $1
    `;

  const { rows } = await connection.query(sql, [etfCode]);

  if (rows.length === 0) {
    return {
      cost: 0.5,
      liquidity: 0.5,
      premium: 0.5, // 네이밍 변경
      quality_total: 0.5,
    };
  }

  const row = rows[0];

  return {
    cost: row.cost_score,
    liquidity: row.liquidity_score,
    premium: row.premium_score, // 네이밍 변경
    quality_total: row.quality_total,
  };
};

module.exports = { getRiskScoreMap, getQuality };
