const getEtfOneDao = async (connection, etfCode, userId) => {
  const sql = `
    WITH user_weights AS (
      SELECT 
        stability_weight,
        liquidity_weight,
        growth_weight,
        diversification_weight
      FROM users
      WHERE user_id = $2
    ),
    user_input AS (
      SELECT ($3 / 30.0) * 100.0 AS user_score_100
    ),
    recent_price AS (
      SELECT DISTINCT ON (etf_code)
        etf_code,
        close_price,
        aum
      FROM new_prices_daily
      ORDER BY etf_code, trade_date DESC
    ),
    lead_return AS (
      SELECT
        etf_code,
        ROUND(
          100.0 * (close_price - LAG(close_price) OVER (PARTITION BY etf_code ORDER BY trade_date)) 
          / LAG(close_price) OVER (PARTITION BY etf_code ORDER BY trade_date), 
          4
        ) AS daily_return
      FROM new_prices_daily
      WHERE etf_code = $1
    ),
    volatility_calc AS (
      SELECT
        etf_code,
        STDDEV_POP(daily_return) AS daily_vol
      FROM lead_return
      GROUP BY etf_code
    ),
    price_stats AS (
      SELECT
        etf_code,
        trade_date,
        close_price,
        MAX(close_price) OVER (PARTITION BY etf_code ORDER BY trade_date) AS max_price_so_far
      FROM new_prices_daily
      WHERE etf_code = $1
    ),
    drawdowns AS (
      SELECT
        etf_code,
        ((close_price - max_price_so_far) / max_price_so_far * 100.0) AS drawdown
      FROM price_stats
    ),
    mdd_calc AS (
      SELECT
        etf_code,
        MIN(drawdown) AS max_drawdown
      FROM drawdowns
      GROUP BY etf_code
    )
    SELECT 
      e.etf_code,
      e.etf_name,
      e.provider,
      ROUND(rc.week1::numeric, 2) AS week1,
      ROUND(rc.month1::numeric, 2) AS month1,
      ROUND(rc.month3::numeric, 2) AS month3,
      ROUND(rc.month6::numeric, 2) AS month6,
      ROUND(rc.year1::numeric, 2) AS year1,
      ROUND(rc.year3::numeric, 2) AS year3,
      ROUND(rc.inception::numeric, 2) AS inception,
      p.close_price AS latest_price,
      p.aum AS latest_aum,
      ROUND(mdd.max_drawdown::numeric, 2) AS max_drawdown,
      ROUND(((rc.year1::numeric / NULLIF(v.daily_vol, 0)) * SQRT(252))::numeric, 2) AS sharpe_ratio,
      ROUND(ers.volatility::numeric, 4) AS volatility,
      ROUND(ers.stability_risk_score::numeric, 2) AS raw_score,
      ROUND(
        (
          ers.stability_score::numeric * uw.stability_weight::numeric +
          ers.liquidity_score::numeric * uw.liquidity_weight::numeric +
          ers.growth_score::numeric * uw.growth_weight::numeric +
          ers.diversification_score::numeric * uw.diversification_weight::numeric
        ), 2
      ) AS total_score
    FROM etfs e
    JOIN etf_return_cache rc ON e.etf_code = rc.etf_code
    LEFT JOIN recent_price p ON e.etf_code = p.etf_code
    LEFT JOIN mdd_calc mdd ON e.etf_code = mdd.etf_code
    LEFT JOIN volatility_calc v ON e.etf_code = v.etf_code
    LEFT JOIN etf_recommendation_score ers ON e.etf_code = ers.etf_code
    CROSS JOIN user_weights uw
    CROSS JOIN user_input
    WHERE e.etf_code = $1
    LIMIT 1;
  `;

  const { rows } = await connection.query(sql, [etfCode, userId, 15]); // 예시 riskScore는 15
  return rows[0];
};

module.exports = { getEtfOneDao };
