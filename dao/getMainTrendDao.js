const getMainTrendDao = {
   getAumDao: async (connection) => {
    const query = `
    SELECT 
e.etf_code ,
e.etf_name ,
npd.close_price ,
npd.trade_date 
FROM new_prices_daily npd
JOIN etfs e ON npd.etf_code = e.etf_code
WHERE npd.trade_date = (
  SELECT MAX(trade_date)
  FROM new_prices_daily
)
ORDER BY npd.aum DESC
LIMIT 5;
    `;
    const result = await connection.query(query);
    return result.rows;
   },

   getFlucDao: async (connection) => {
    const query = `
    SELECT 
e.etf_code ,
e.etf_name ,
npd.close_price ,
npd.trade_date 
FROM new_prices_daily npd
JOIN etfs e ON npd.etf_code = e.etf_code
WHERE npd.trade_date = (
  SELECT MAX(trade_date)
  FROM new_prices_daily
)
ORDER BY npd.fluc_rt1 DESC
LIMIT 5;
    `;
    const result = await connection.query(query);
    return result.rows;
   },

   getVolumeDao: async (connection) => {
    const query = `
    SELECT 
e.etf_code ,
e.etf_name ,
npd.close_price ,
npd.trade_date 
    FROM new_prices_daily npd
    JOIN etfs e ON npd.etf_code = e.etf_code
    WHERE npd.trade_date = (
      SELECT MAX(trade_date)
      FROM new_prices_daily
    )
    ORDER BY npd.volume DESC
    LIMIT 5;
    `;
     const result = await connection.query(query);
    return result.rows;
   },
};            

module.exports = { getMainTrendDao };