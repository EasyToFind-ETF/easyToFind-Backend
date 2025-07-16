const getEtfFindDao = async (
  Connection,
  query,
  sort,
  assetClass,
  theme,
  isFavorite
) => {
  const today = new Date();
  const format = (d) => d.toISOString().split("T")[0];

  const periods = {
    "1주": format(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)),
    "1개월": format(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)),
    "3개월": format(new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)),
    "6개월": format(new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000)),
    "1년": format(new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)),
    "3년": format(new Date(today.getTime() - 365 * 3 * 24 * 60 * 60 * 1000)),
  };

  const start_date = new Date();

  const sql = `
    SELECT  e.etf_code, e.etf_name, e.provider, e.asset_class, e.theme,
      e.expense_ratio, e.inception_date,
      p.close_price, p.aum
    from etfs e
    join prices_daily p
    using (etf_code)
    where e.etf_name like '%KODEX%'
    order by p.etf_code, p.trade_date;
  `;

  // {
  //   etf_code: '213610',
  //   etf_name: 'KODEX 삼성그룹밸류',
  //   provider: '삼성자산운용',
  //   asset_class: '주식',
  //   theme: '기타',
  //   expense_ratio: 0.09,
  //   inception_date: 2015-01-07T15:00:00.000Z,
  //   close_price: 9170,
  //   aum: '8256657260.0'
  // },

  // 1주전
  // 1개월전
  // 3개월전
  // 6개월전
  // 1년전
  // 3년전
  // 상장 이후 (first)

  const { rows } = await Connection.query(sql);
  rows.forEach((etf) => {
    const returnRates = {};
  });

  console.log(rows);

  console.log("end-start:", `${Date.now() - start_date.getTime()}ms`);
  return {
    // etf_code: etf.etf_code,
    // etf_name: etf.etf_name,
    // provider: etf.provider,
    // asset_class: etf.asset_class,
    // theme: etf.theme,
    // expense_ratio: etf.expense_ratio,
    // price: etf.latest_price,
    // aum: etf.aum,
    // returnRates,
  };

  // const sql2 = `
  //   WITH latest_price AS (
  //     SELECT DISTINCT ON (etf_code)
  //       etf_code, close_price AS latest_price, aum
  //     FROM prices_daily
  //     ORDER BY etf_code, trade_date DESC
  //   ),
  //   first_price AS (
  //     SELECT DISTINCT ON (etf_code)
  //       etf_code, close_price AS first_price
  //     FROM prices_daily
  //     ORDER BY etf_code, trade_date ASC
  //   )
  //   SELECT
  //     e.etf_code, e.etf_name, e.provider, e.asset_class, e.theme,
  //     e.expense_ratio, e.inception_date,
  //     lp.latest_price, lp.aum,
  //     fp.first_price,
  //     ${Object.entries(periods)
  //       .map(
  //         ([label, date], idx) => `
  //       (
  //         SELECT close_price FROM prices_daily
  //         WHERE etf_code = e.etf_code
  //           AND trade_date <= '${date}'
  //           AND close_price IS NOT NULL
  //         ORDER BY trade_date DESC
  //         LIMIT 1
  //       ) AS period_${idx}`
  //       )
  //       .join(",")}
  //   FROM etfs e
  //   LEFT JOIN latest_price lp ON e.etf_code = lp.etf_code
  //   LEFT JOIN first_price fp ON e.etf_code = fp.etf_code
  //   WHERE 1=1
  //     ${query ? `AND (e.etf_code ILIKE $1 OR e.etf_name ILIKE $1)` : ""}
  //     ${assetClass ? `AND e.asset_class = $${query ? 2 : 1}` : ""}
  //     ${
  //       theme
  //         ? `AND e.theme = $${
  //             query && assetClass ? 3 : query || assetClass ? 2 : 1
  //           }`
  //         : ""
  //     }
  //   ${sort ? `ORDER BY ${sort} ASC` : ""}
  // `;

  // const params = [];
  // if (query) params.push(`%${query}%`);
  // if (assetClass) params.push(assetClass);
  // if (theme) params.push(theme);

  // const { rows } = await Connection.query(sql, params);

  // console.log("end-start:", `${Date.now() - start_date.getTime()}ms`);

  // // 수익률 계산은 여기서 최종 변환 (JS에서 계산)
  // return rows.map((etf) => {
  //   const returnRates = {};
  //   Object.keys(periods).forEach((label, idx) => {
  //     const past = etf[`period_${idx}`];
  //     const now = etf.latest_price;
  //     returnRates[label] = past
  //       ? +(((now - past) / past) * 100).toFixed(2)
  //       : "-";
  //   });

  //   returnRates["상장 이후"] = etf.first_price
  //     ? +(
  //         ((etf.latest_price - etf.first_price) / etf.first_price) *
  //         100
  //       ).toFixed(2)
  //     : "-";

  //   return {
  //     etf_code: etf.etf_code,
  //     etf_name: etf.etf_name,
  //     provider: etf.provider,
  //     asset_class: etf.asset_class,
  //     theme: etf.theme,
  //     expense_ratio: etf.expense_ratio,
  //     price: etf.latest_price,
  //     aum: etf.aum,
  //     returnRates,
  //   };
  // });
};

module.exports = { getEtfFindDao };
