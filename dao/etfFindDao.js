const getEtfFindDao = async (
  Connection,
  query,
  sort,
  assetClass,
  theme,
  isFavorite
) => {
  // console.log("🚀 [DAO] getEtfFindDao 진입");
  // console.log("🔍 [Input] query:", query);
  // console.log("🔍 [Input] sort:", sort);
  // console.log("🔍 [Input] assetClass:", assetClass);
  // console.log("🔍 [Input] theme:", theme);
  // console.log("🔍 [Input] isFavorite:", isFavorite);
  // console.log("✅ [Service] getEtfFindService 호출됨");

  let sql = `SELECT etf_code, etf_name, provider, asset_class, theme, expense_ratio, inception_date FROM etfs WHERE 1=1`;
  const params = [];

  if (query) {
    const index = params.length + 1;
    sql += ` AND (etf_code ILIKE $${index} OR etf_name ILIKE $${index})`;
    params.push(`%${query}%`);
  }

  if (assetClass) {
    sql += ` AND asset_class = $${params.length + 1}`;
    params.push(assetClass);
  }

  if (theme) {
    sql += ` AND theme = $${params.length + 1}`;
    params.push(theme);
  }

  // if (isFavorite) {
  //   sql += ` AND is_favorite = true`;
  // }

  if (sort) {
    sql += ` ORDER BY ${sort} ASC`;
  }

  const { rows: etfs } = await Connection.query(sql, params);

  const result = [];

  for (const etf of etfs) {
    const { etf_code, inception_date } = etf;

    // 최신 가격 불러오기
    const {
      rows: [latest],
    } = await Connection.query(
      `SELECT close_price, aum FROM prices_daily WHERE etf_code = $1 ORDER BY trade_date DESC LIMIT 1`,
      [etf_code]
    );

    const nowPrice = latest?.close_price;
    const nowAum = latest?.aum;

    const returns = {};
    const today = new Date();
    const periods = {
      "1주": new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
      "1개월": new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
      "3개월": new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
      "6개월": new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000),
      "1년": new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000),
      "3년": new Date(today.getTime() - 365 * 3 * 24 * 60 * 60 * 1000),
    };

    for (const [label, dateObj] of Object.entries(periods)) {
      const date = dateObj.toISOString().split("T")[0];
      const { rows } = await Connection.query(
        `SELECT close_price FROM prices_daily WHERE etf_code = $1 AND trade_date <= $2 AND close_price IS NOT NULL ORDER BY trade_date DESC LIMIT 1`,
        [etf_code, date]
      );

      if (!rows.length) {
        returns[label] = "-";
      } else {
        const past = rows[0].close_price;
        returns[label] = past
          ? +(((nowPrice - past) / past) * 100).toFixed(2)
          : "-";
      }
    }

    // 상장 이후 수익률
    const {
      rows: [first],
    } = await Connection.query(
      `SELECT close_price FROM prices_daily WHERE etf_code = $1 ORDER BY trade_date ASC LIMIT 1`,
      [etf_code]
    );
    if (first?.close_price) {
      returns["상장 이후"] = +(
        ((nowPrice - first.close_price) / first.close_price) *
        100
      ).toFixed(2);
    } else {
      returns["상장 이후"] = "-";
    }

    result.push({
      etf_code: etf.etf_code,
      etf_name: etf.etf_name,
      provider: etf.provider,
      asset_class: etf.asset_class,
      theme: etf.theme,
      expense_ratio: etf.expense_ratio,
      price: nowPrice,
      aum: nowAum,
      returns,
    });
  }

  return result;
};

module.exports = { getEtfFindDao };
