const getTestThemeResultDao = {
  getTTRDao: async (
    connection,
    returnRate,
    liquidity,
    trackingError,
    aum,
    theme
  ) => {
    const query = `
WITH latest_data AS (
  SELECT DISTINCT ON (etf_code)
    etf_code,
    close_price,
    nav_price,
    change_rate,
    acc_trd_val,
    aum,
    trade_date
  FROM new_prices_daily
  ORDER BY etf_code, trade_date DESC
),
prepared AS (
  SELECT
    l.*,
    e.etf_name,
    e.theme,
    ABS(l.close_price - l.nav_price) AS tracking_error
  FROM latest_data l
  JOIN etfs e ON l.etf_code = e.etf_code
  WHERE e.theme = $5
),
stats AS (
  SELECT
    AVG(change_rate) AS avg_return,
    STDDEV(change_rate) AS std_return,
    AVG(acc_trd_val) AS avg_liquidity,
    STDDEV(acc_trd_val) AS std_liquidity,
    AVG(tracking_error) AS avg_error,
    STDDEV(tracking_error) AS std_error,
    AVG(aum) AS avg_aum,
    STDDEV(aum) AS std_aum
  FROM prepared
),
zscore_raw AS (
  SELECT
    p.etf_code,
    p.etf_name,
    p.theme,
    p.change_rate,
    p.acc_trd_val,
    p.aum,
    ((p.change_rate - s.avg_return) / NULLIF(s.std_return, 0)) AS z_ret,
    ((p.acc_trd_val - s.avg_liquidity) / NULLIF(s.std_liquidity, 0)) AS z_liq,
    -1 * ((ABS(p.close_price - p.nav_price) - s.avg_error) / NULLIF(s.std_error, 0)) AS z_err,
    ((p.aum - s.avg_aum) / NULLIF(s.std_aum, 0)) AS z_aum
  FROM prepared p, stats s
),
log_scaled AS (
  SELECT
    *,
    LN(1 + GREATEST(z_ret, 0)) AS log_ret,
    LN(1 + GREATEST(z_liq, 0)) AS log_liq,
    LN(1 + GREATEST(z_err, 0)) AS log_err,
    LN(1 + GREATEST(z_aum, 0)) AS log_aum
  FROM zscore_raw
),
norm_range AS (
  SELECT
    MIN(log_ret) AS min_ret, MAX(log_ret) AS max_ret,
    MIN(log_liq) AS min_liq, MAX(log_liq) AS max_liq,
    MIN(log_err) AS min_err, MAX(log_err) AS max_err,
    MIN(log_aum) AS min_aum, MAX(log_aum) AS max_aum
  FROM log_scaled
),
normalized AS (
  SELECT
    l.etf_code,
    l.etf_name,
    l.change_rate,
    l.acc_trd_val,
    l.aum,
    (l.log_ret - r.min_ret) / NULLIF(r.max_ret - r.min_ret, 0) AS norm_ret,
    (l.log_liq - r.min_liq) / NULLIF(r.max_liq - r.min_liq, 0) AS norm_liq,
    (l.log_err - r.min_err) / NULLIF(r.max_err - r.min_err, 0) AS norm_err,
    (l.log_aum - r.min_aum) / NULLIF(r.max_aum - r.min_aum, 0) AS norm_aum
  FROM log_scaled l, norm_range r
),
final AS (
  SELECT
    n.*,
    ROUND((
      $1 * norm_ret +
      $2 * norm_liq +
      $3 * norm_err +
      $4 * norm_aum
    ) * 100.0, 2) AS total_score
  FROM normalized n
)
SELECT
  f.etf_name,
  ROUND(f.change_rate::numeric, 2) AS return_rate,
  f.acc_trd_val AS liquidity,
  f.aum,
  ers.stability_risk_score,
  f.total_score
FROM final f
LEFT JOIN etf_recommendation_score ers ON f.etf_code = ers.etf_code
ORDER BY total_score DESC
LIMIT 5;


`;
    console.log("ddd", returnRate, liquidity, trackingError, aum, theme);
    const result = await connection.query(query, [
      returnRate,
      liquidity,
      trackingError,
      aum,
      theme,
    ]);
    return result.rows;
  },
};
module.exports = getTestThemeResultDao;
