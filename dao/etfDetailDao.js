const pool = require("../common/database");

const getEtfDetailDao = async (etfCode) => {
    try {
        console.log(`[DAO] getEtfDetailDao called with etfCode: ${etfCode}`);

        const query = `
            SELECT 
                e.etf_code,
                e.etf_name,
                e.ticker,
                e.provider,
                e.asset_class,
                e.theme,
                e.expense_ratio,
                e.is_listed,
                e.delisted_at,
                e.inception_date,
                e.currency,
                e.created_at,
                e.updated_at,
                e.is_retire_pension,
                e.is_personal_pension,
                p.trade_date,
                p.open_price,
                p.high_price,
                p.low_price,
                p.close_price,
                p.volume,
                p.nav_price,
                p.change_rate,
                p.aum,
                p.cmp_prev_dd_price,
                p.acc_trd_val,
                p.mkt_cap,
                p.list_shrs,
                p.idx_ind_nm,
                p.obj_stk_prc_idx,
                p.cmp_prev_dd_idx,
                p.fluc_rt1
            FROM etfs e
            LEFT JOIN new_prices_daily p ON e.etf_code = p.etf_code
            WHERE e.etf_code = $1
            ORDER BY p.trade_date DESC
        `;

        console.log(`[DAO] Executing query with parameter: ${etfCode}`);
        const result = await pool.query(query, [etfCode]);
        console.log(`[DAO] Query result: ${result.rows.length} rows found`);

        if (result.rows.length === 0) {
            console.log(`[DAO] No data found for ETF code: ${etfCode}`);
            return null;
        }

        console.log(`[DAO] First row sample:`, result.rows[0]);
        return result.rows;
    } catch (error) {
        console.error("ETF 상세 정보 조회 DAO 에러:", error);
        throw error;
    }
};

const getEtfYieldDao = async (etfCode) => {
    try {
        // etf_return_cache 테이블에서 미리 계산된 수익률 데이터 조회
        const query = `
            SELECT 
                etf_code,
                etf_name,
                asset_class,
                theme,
                week1,
                month1,
                month3,
                month6,
                year1,
                year3,
                inception,
                latest_price
            FROM etf_return_cache
            WHERE etf_code = $1
        `;

        const result = await pool.query(query, [etfCode]);

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0];
    } catch (error) {
        console.error("ETF 수익률 데이터 조회 DAO 에러:", error);
        throw error;
    }
};

const getEtfHoldingsDao = async (etfCode, date = null) => {
    try {
        console.log(`Fetching holdings data for ETF: ${etfCode}`);

        // etfs + etf_holdings + stock 조인
        // SUBSTRING(s.holding_code FROM 4 FOR 6) as stock_code, 부분 고려해야 함
        let query = `
            SELECT 
                e.etf_code,
                e.etf_name,
                h.holdings_id,
                h.weight_pct,
                h.ver,
                h.update_at,
                s.holding_code as stock_code,
                s.holding_name as stock_name
            FROM etfs e
            INNER JOIN etf_holdings h ON e.etf_code = h.etf_code
            LEFT JOIN stock s ON h.holdings_id = s.holdings_id
            WHERE e.etf_code = $1
        `;

        let params = [etfCode];

        // 모든 holdings 데이터 조회 (날짜 필터링 제거)
        query += ` ORDER BY h.weight_pct DESC`;

        console.log('Executing JOIN query with params:', params);
        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            console.log(`No holdings data found for ETF code: ${etfCode}`);
            return [];
        }

        console.log(`Found ${result.rows.length} holdings records for ETF: ${etfCode}`);
        console.log('Sample holdings data:', result.rows[0]);

        return result.rows;

    } catch (error) {
        console.error("ETF 보유 종목 데이터 조회 DAO 에러:", error);
        throw error;
    }
};

const getEtfRecommendationScoreDao = async (etfCode) => {
    try {
        console.log(`[DAO] getEtfRecommendationScoreDao called with etfCode: ${etfCode}`);

        const query = `
            SELECT 
                base_date,
                etf_code,
                group_id,
                detail,
                mdd,
                volatility,
                return_1y,
                latest_aum,
                expense_ratio,
                etf_score,
                stability_risk_score,
                stability_score,
                liquidity_score,
                growth_score,
                diversification_score,
                aum_score,
                mdd_score,
                dif_score
            FROM etf_recommendation_score
            WHERE etf_code = $1
            ORDER BY base_date DESC
            LIMIT 1
        `;

        console.log(`[DAO] Executing recommendation score query with parameter: ${etfCode}`);
        const result = await pool.query(query, [etfCode]);
        console.log(`[DAO] Recommendation score query result: ${result.rows.length} rows found`);

        if (result.rows.length === 0) {
            console.log(`[DAO] No recommendation score data found for ETF code: ${etfCode}`);
            return null;
        }

        console.log(`[DAO] Recommendation score data:`, result.rows[0]);
        return result.rows[0];
    } catch (error) {
        console.error("ETF 추천 점수 데이터 조회 DAO 에러:", error);
        throw error;
    }
};

module.exports = {
    getEtfDetailDao,
    getEtfYieldDao,
    getEtfHoldingsDao,
    getEtfRecommendationScoreDao,
};
