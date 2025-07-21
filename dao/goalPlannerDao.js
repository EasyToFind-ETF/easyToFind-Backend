// dao/goalPlannerDao.js (서브쿼리 버전)
const getGoalPlanDao = async (connection, etfLimit) => {
  const sql = `
    WITH top_etfs AS (
      SELECT e.etf_code, e.etf_name, e.asset_class, e.theme
      FROM etfs e
      JOIN etf_recommendation_score ers ON e.etf_code = ers.etf_code
      WHERE ers.latest_aum IS NOT NULL
      ORDER BY ers.latest_aum DESC
      LIMIT $1
    )
    SELECT
      jsonb_build_object(
        'etf_code',   te.etf_code,
        'etf_name',   te.etf_name,
        'asset_class',te.asset_class,
        'theme',      te.theme,
        'prices',
          jsonb_agg(
            jsonb_build_object(
              'date',  p.trade_date,
              'price', p.close_price,
              'aum',   p.aum
            ) ORDER BY p.trade_date
          )
      ) AS etf_json
    FROM top_etfs te
    JOIN prices_daily p ON te.etf_code = p.etf_code
    WHERE p.trade_date >= (CURRENT_DATE AT TIME ZONE 'Asia/Seoul') - INTERVAL '5 years'
    GROUP BY te.etf_code, te.etf_name, te.asset_class, te.theme
  `;

  console.log("🗄️ DAO: SQL 쿼리 실행, etfLimit:", etfLimit);

  const { rows } = await connection.query(sql, [etfLimit]);
  console.log("��️ DAO: 조회된 ETF 수:", rows.length);

  // JSON 파싱하여 반환
  const result = rows.map((r) => r.etf_json);
  console.log("🗄️ DAO: 파싱 완료, 반환할 ETF 수:", result.length);

  return result;
};

module.exports = { getGoalPlanDao };
