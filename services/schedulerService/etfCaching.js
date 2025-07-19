const { Pool } = require("pg");

const pool = require("../../common/database");

(async () => {
  const client = await pool.connect();
  try {
    const today = new Date();
    const format = (d) => d.toISOString().split("T")[0];

    const periods = {
      "1주": format(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)),
      "1개월": format(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)),
      "3개월": format(new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)),
      "6개월": format(new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000)),
      "1년": format(new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)),
      "3년": format(new Date(today.getTime() - 3 * 365 * 24 * 60 * 60 * 1000)),
    };

    const unionQueries = Object.entries(periods)
      .map(
        ([label, date]) => `
        SELECT * FROM (
          SELECT 
            p.etf_code, '${label}' AS period_label,
            p.trade_date, p.close_price, p.aum,
            ROW_NUMBER() OVER (PARTITION BY p.etf_code ORDER BY p.trade_date DESC) AS rn
          FROM prices_daily p
          WHERE p.trade_date <= '${date}'
        ) sub
        WHERE rn = 1
      `
      )
      .join(" UNION ALL ");

    const sql = `
      WITH latest_price AS (
        SELECT DISTINCT ON (etf_code)
          etf_code, close_price AS latest_price
        FROM prices_daily
        ORDER BY etf_code, trade_date DESC
      ),
      filtered_prices AS (
        ${unionQueries}
      ),
      first_price AS (
        SELECT DISTINCT ON (p.etf_code)
          p.etf_code,
          p.trade_date AS first_trade_date,
          p.close_price AS first_price,
          p.aum AS first_aum
        FROM prices_daily p
        JOIN etfs e ON p.etf_code = e.etf_code
        WHERE p.trade_date >= e.inception_date
        ORDER BY p.etf_code, p.trade_date ASC
      )
      SELECT 
        e.etf_code, e.etf_name, e.asset_class, e.theme,
        fp.period_label, fp.close_price,
        lp.latest_price,
        fsp.first_price
      FROM filtered_prices fp
      JOIN etfs e ON fp.etf_code = e.etf_code
      JOIN latest_price lp ON fp.etf_code = lp.etf_code
      LEFT JOIN first_price fsp ON fp.etf_code = fsp.etf_code;
    `;

    const result = await client.query(sql);

    const grouped = {};

    result.rows.forEach((row) => {
      const {
        etf_code,
        etf_name,
        asset_class,
        theme,
        period_label,
        close_price,
        latest_price,
        first_price,
      } = row;

      if (!grouped[etf_code]) {
        grouped[etf_code] = {
          etf_code,
          etf_name,
          asset_class,
          theme,
          수익률: {},
          latest_price,
        };
      }

      if (period_label && close_price != null) {
        grouped[etf_code].수익률[period_label] = +(
          ((latest_price - close_price) / close_price) *
          100
        ).toFixed(2);
      }

      if (!grouped[etf_code].수익률["상장일"] && first_price) {
        grouped[etf_code].수익률["상장일"] = +(
          ((latest_price - first_price) / first_price) *
          100
        ).toFixed(2);
      }
    });

    const upserts = Object.values(grouped).map((etf) => {
      const r = etf.수익률;
      return client.query(
        `
        INSERT INTO etf_return_cache (
          etf_code, etf_name, asset_class, theme,
          week1, month1, month3, month6, year1, year3, inception, latest_price
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (etf_code) DO UPDATE SET
          etf_name = EXCLUDED.etf_name,
          asset_class = EXCLUDED.asset_class,
          theme = EXCLUDED.theme,
          week1 = EXCLUDED.week1,
          month1 = EXCLUDED.month1,
          month3 = EXCLUDED.month3,
          month6 = EXCLUDED.month6,
          year1 = EXCLUDED.year1,
          year3 = EXCLUDED.year3,
          inception = EXCLUDED.inception,
          latest_price = EXCLUDED.latest_price;
        `,
        [
          etf.etf_code,
          etf.etf_name,
          etf.asset_class,
          etf.theme,
          r["1주"] ?? null,
          r["1개월"] ?? null,
          r["3개월"] ?? null,
          r["6개월"] ?? null,
          r["1년"] ?? null,
          r["3년"] ?? null,
          r["상장일"] ?? null,
          etf.latest_price ?? null,
        ]
      );
    });

    await Promise.all(upserts);
    console.log("✅ etf_return_cache 캐시 업데이트 완료!");
  } catch (err) {
    console.error("❌ 오류 발생:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
