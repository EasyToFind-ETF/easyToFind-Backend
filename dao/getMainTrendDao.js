const getMainTrendDao = {
  getAumDao: async (connection) => {
    const query = `
        SELECT 
      e.etf_code ,
      e.etf_name ,
      npd.close_price ,
      npd.trade_date ,
      npd.aum,
      erc.week1 ,
      e.is_retire_pension ,
      e.is_personal_pension 
      FROM new_prices_daily npd
      JOIN etfs e ON npd.etf_code = e.etf_code
      join etf_return_cache erc on erc.etf_code  = npd.etf_code 
      WHERE npd.trade_date = (
        SELECT MAX(trade_date)
        FROM new_prices_daily
      )
      ORDER BY npd.aum DESC
      LIMIT 5;
    `;

    const result = await connection.query(query);
    console.log("result", result);
    return result.rows;
  },

  getFlucDao: async (connection) => {
    const query = `

      SELECT 
      e.etf_code ,
      e.etf_name ,
      npd.close_price ,
      npd.trade_date ,
      npd.aum,
      erc.week1 ,
      e.is_retire_pension ,
      e.is_personal_pension 
      FROM new_prices_daily npd
      JOIN etfs e ON npd.etf_code = e.etf_code
      join etf_return_cache erc on erc.etf_code  = npd.etf_code 
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
      npd.trade_date ,
      npd.aum,
      erc.week1 ,
      e.is_retire_pension ,
      e.is_personal_pension 
      FROM new_prices_daily npd
      JOIN etfs e ON npd.etf_code = e.etf_code
      join etf_return_cache erc on erc.etf_code  = npd.etf_code 
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
