// dao/goalPlannerDao.js
const getGoalPlanDao = async (connection) => {
  console.log("��️ DAO: ETF 가격 데이터 조회 시작");

  const sql = `
    SELECT 
      p.etf_code,
      e.etf_name,
      e.asset_class,
      e.theme,
      p.trade_date,
      p.close_price,
      p.aum
    FROM prices_daily p
    JOIN etfs e ON p.etf_code = e.etf_code
    WHERE p.trade_date >= CURRENT_DATE - INTERVAL '5 years'
    ORDER BY p.etf_code, p.trade_date ASC
  `;

  const { rows } = await connection.query(sql);
  console.log("🗄️ DAO: 조회된 행 수:", rows.length);

  // ETF별로 데이터 그룹화
  const groupedData = {};
  rows.forEach((row) => {
    if (!groupedData[row.etf_code]) {
      groupedData[row.etf_code] = {
        etf_code: row.etf_code,
        etf_name: row.etf_name,
        asset_class: row.asset_class,
        theme: row.theme,
        prices: [],
      };
    }
    groupedData[row.etf_code].prices.push({
      date: row.trade_date,
      price: row.close_price,
      aum: row.aum,
    });
  });

  console.log("🗄️ DAO: 그룹화된 ETF 수:", Object.keys(groupedData).length);
  return Object.values(groupedData);
};

module.exports = { getGoalPlanDao };
