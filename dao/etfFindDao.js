const getEtfFindDao = async (
  Connection,
  query,
  sort,
  assetClass,
  theme,
  isFavorite // ← 지금은 안 쓰지만 추후에 즐겨찾기 기능 추가되면 확장 가능
) => {
  let sql = `
  SELECT
    etf_code,
    etf_name,
    asset_class,
    theme,
    ROUND(week1::numeric, 2) AS week1,
    ROUND(month1::numeric, 2) AS month1,
    ROUND(month3::numeric, 2) AS month3,
    ROUND(month6::numeric, 2) AS month6,
    ROUND(year1::numeric, 2) AS year1,
    ROUND(year3::numeric, 2) AS year3,
    ROUND(inception::numeric, 2) AS inception,
    latest_price
  FROM etf_return_cache
  WHERE 1=1
`;
  const params = [];

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
