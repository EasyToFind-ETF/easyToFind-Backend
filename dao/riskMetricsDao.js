// dao/riskMetricsDao.js
const getPersonalScoreMap = async (connection, userId) => {
  let sql;
  let params;

  if (userId) {
    // 로그인한 사용자: DB에서 가중치 조회
    sql = `
      SELECT 
        e.etf_code,
        ROUND(
          (COALESCE(e.stability_score, 50) * COALESCE(u.stability_weight, 0.25) +
          COALESCE(e.liquidity_score, 50) * COALESCE(u.liquidity_weight, 0.25) +
          COALESCE(e.growth_score, 50) * COALESCE(u.growth_weight, 0.25) +
          COALESCE(e.diversification_score, 50) * COALESCE(u.diversification_weight, 0.25))::numeric
        , 2) AS personal_score
      FROM etf_recommendation_score e
      JOIN users u ON u.user_id = $1
      WHERE e.base_date = (SELECT MAX(base_date) FROM etf_recommendation_score)
    `;
    params = [userId];
  } else {
    // 비로그인 사용자: 기본 가중치 (0.25, 0.25, 0.25, 0.25) 사용
    sql = `
      SELECT 
        e.etf_code,
        ROUND(
          (COALESCE(e.stability_score, 50) * 0.25 +
          COALESCE(e.liquidity_score, 50) * 0.25 +
          COALESCE(e.growth_score, 50) * 0.25 +
          COALESCE(e.diversification_score, 50) * 0.25)::numeric
        , 2) AS personal_score
      FROM etf_recommendation_score e
      WHERE e.base_date = (SELECT MAX(base_date) FROM etf_recommendation_score)
    `;
    params = [];
  }

  const { rows } = await connection.query(sql, params);
  console.log("📊 개인화 점수 조회 결과:", rows.length, "개 ETF");

  const personalMap = {};
  rows.forEach((row) => {
    personalMap[row.etf_code] = row.personal_score;
  });

  return personalMap;
};

module.exports = { getPersonalScoreMap };
