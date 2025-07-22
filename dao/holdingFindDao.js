const path = require("path");
const fs = require("fs");

const getHoldingFindDao = async (
  Connection,
  query,
  sort,
  assetClass,
  theme,
  isFavorite,
  userId
) => {
  const isOnlySortWeightPct =
    sort === "weight_pct" &&
    !query &&
    (!assetClass || assetClass === "전체") &&
    (!theme || theme === "전체");

  if (isOnlySortWeightPct) {
    const jsonPath = path.join(__dirname, "../data/holdings_none.json");
    const rawData = fs.readFileSync(jsonPath);
    const parsed = JSON.parse(rawData);
    return parsed.data;
  }

  const params = [];
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

  sql += `) s ON eh.holdings_id = s.holdings_id\n`;

  sql += `WHERE 1=1\n`;

  // ✅ 관심 ETF 조건은 여기로 옮기자!
  if (isFavorite === "true" && userId) {
    sql += ` AND e.etf_code IN (
      SELECT etf_code FROM user_favorites WHERE user_id = $${params.length + 1}
    )`;
    params.push(userId);
  }

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

  const { rows } = await Connection.query(sql, params);
  return rows;
};

module.exports = { getHoldingFindDao };
