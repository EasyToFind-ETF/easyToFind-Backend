const getTestThemeResultDao = {
  getTTRDao: async (connection, riskScore, theme) => {
    const query = `WITH user_input AS (
  SELECT ($1 / 30.0) * 100.0 AS user_score_100  -- 예: 30점 → 100점
),
scored_etfs AS (
  SELECT
    ers.etf_code,
    e.etf_name,
    e.theme,
    ers.score,
    ers.return_1y,
    ers.latest_aum,
    ers.expense_ratio,
    ROUND(100 * EXP( - POWER((ers.score - ui.user_score_100) / 18.0, 2) )::numeric, 2) AS match_score
  FROM etf_recommendation_score ers
  JOIN etfs e ON ers.etf_code = e.etf_code
  CROSS JOIN user_input ui
  WHERE e.theme = $2  -- ← 여기에 원하는 테마명을 넣으세요
)
SELECT *
FROM scored_etfs
ORDER BY match_score DESC
LIMIT 5;
`;
    const result = await connection.query(query, [riskScore, theme]);
    return result.rows;
  },
};
module.exports = getTestThemeResultDao;
