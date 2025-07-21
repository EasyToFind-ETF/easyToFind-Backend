const getEtfFindDao = async (
  Connection,
  query,
  sort,
  assetClass,
  theme,
  isFavorite,
  userId
) => {
  let sql = `
  SELECT
    e.etf_code,
    e.etf_name,
    e.asset_class,
    e.theme,
    ROUND(e.week1::numeric, 2) AS week1,
    ROUND(e.month1::numeric, 2) AS month1,
    ROUND(e.month3::numeric, 2) AS month3,
    ROUND(e.month6::numeric, 2) AS month6,
    ROUND(e.year1::numeric, 2) AS year1,
    ROUND(e.year3::numeric, 2) AS year3,
    ROUND(e.inception::numeric, 2) AS inception,
    e.latest_price
  FROM etf_return_cache AS e
  WHERE 1=1
`;
  const params = [];

  if (isFavorite === "true" && userId) {
    sql += ` AND e.etf_code IN (
      SELECT etf_code FROM user_favorites WHERE user_id = $${params.length + 1}
    )`;
    params.push(userId);
  }

  if (query) {
    sql += ` AND (etf_code ILIKE $${params.length + 1} OR etf_name ILIKE $${
      params.length + 2
    })`;
    params.push(`%${query}%`, `%${query}%`);
  }

  if (assetClass && assetClass !== "전체") {
    sql += ` AND asset_class = $${params.length + 1}`;
    params.push(assetClass);
  }

  if (theme && theme !== "전체") {
    sql += ` AND theme = $${params.length + 1}`;
    params.push(theme);
  }

  if (sort) {
    const validSorts = [
      "week1",
      "month1",
      "month3",
      "month6",
      "year1",
      "year3",
      "inception",
    ];
    if (validSorts.includes(sort)) {
      sql += ` ORDER BY ${sort} DESC`; // 수익률 높은 순
    }
  }

  const { rows } = await Connection.query(sql, params);
  return rows;
};

module.exports = { getEtfFindDao };
