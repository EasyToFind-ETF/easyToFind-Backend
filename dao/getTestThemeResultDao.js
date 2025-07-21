const getTestThemeResultDao = {
  getTTRDao: async (connection, riskScore, theme) => {
    const query = `WITH params AS (
  SELECT ($1 / 35.0) * 100 AS user_score
),
latest_prices AS (
  SELECT npd.etf_code, npd.aum, npd.mkt_cap
  FROM new_prices_daily npd
  INNER JOIN (
    SELECT etf_code, MAX(trade_date) AS max_date
    FROM new_prices_daily
    GROUP BY etf_code
  ) latest
  ON npd.etf_code = latest.etf_code AND npd.trade_date = latest.max_date
),
matched AS (
  SELECT
    ers.etf_code,
    e.etf_name,
    ers.etf_score,
    ers.stability_risk_score,
    ers.mdd,
    ers.volatility,
    lp.aum,
    lp.mkt_cap,
    e.theme,
    100 - ABS(p.user_score - ers.stability_risk_score) AS risk_match_score
  FROM etf_recommendation_score ers
  JOIN latest_prices lp ON ers.etf_code = lp.etf_code
  JOIN etfs e ON ers.etf_code = e.etf_code
  CROSS JOIN params p
  WHERE e.theme = $2
),
ranked AS (
  SELECT
    etf_code,
    etf_name,
    etf_score,
    stability_risk_score,
    mdd,
    volatility,
    aum,
    mkt_cap,
    theme,
    risk_match_score,
    ROUND((0.7 * risk_match_score + 0.3 * etf_score)::numeric, 2) AS final_score
  FROM matched
)
SELECT *
FROM ranked
ORDER BY final_score DESC
LIMIT 5;


`;

    const result = await connection.query(query, [riskScore, theme]);
    return result.rows;
  },
};
module.exports = getTestThemeResultDao;
