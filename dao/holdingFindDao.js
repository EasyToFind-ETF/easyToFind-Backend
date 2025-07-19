const getHoldingFindDao = async (
  Connection,
  query,
  sort,
  assetClass,
  theme,
  isFavorite
) => {
  const params = [];
  const conditions = [];

  let sql = `
    SELECT 
      e.etf_code, 
      e.etf_name, 
      s.holding_code, 
      s.holding_name, 
      eh.weight_pct
    FROM etf_holdings eh
    JOIN etfs e ON eh.etf_code = e.etf_code
    JOIN (
      SELECT * FROM stock
      WHERE 1=1
  `;

  if (query) {
    sql += ` AND (holding_name ILIKE $${
      params.length + 1
    } OR holding_code ILIKE $${params.length + 2})`;
    params.push(`%${query}%`, `%${query}%`);
  }

  sql += `) s ON eh.holdings_id = s.holdings_id\n`; // 서브쿼리 닫기

  sql += `WHERE 1=1\n`; // main WHERE

  if (assetClass && assetClass !== "전체") {
    sql += ` AND e.asset_class = $${params.length + 1}`;
    params.push(assetClass);
  }

  if (theme && theme !== "전체") {
    sql += ` AND e.theme = $${params.length + 1}`;
    params.push(theme);
  }

  if (sort === "weight_pct") {
    sql += ` ORDER BY eh.weight_pct DESC`;
  }

  console.log("🚀 최적화된 Holding Find SQL:", sql);

  const { rows } = await Connection.query(sql, params);
  return rows;
};

module.exports = { getHoldingFindDao };
