const { successResponse, failResponse } = require("../common/Response");
const responseMessage = require("../common/responseMessages");
const { getEtfDetailService, getEtfYieldDataService, getEtfHoldingsService, getEtfRecommendationScoreService } = require("../services/etfDetailService");

const etfDetailController = {
    getEtfDetail: async (req, res) => {
        const { etf_code } = req.params;

        if (!etf_code) {
            return res.status(400).json(
                failResponse(
                    responseMessage.fail.read.status,
                    "ETF 코드가 필요합니다."
                )
            );
        }

        try {
            console.log(`[Controller] Starting ETF detail fetch for: ${etf_code}`);

            const result = await getEtfDetailService(etf_code);
            console.log(`[Controller] getEtfDetailService result:`, result ? `Found ${result.length} records` : 'null/empty');

            const yieldData = await getEtfYieldDataService(etf_code);
            console.log(`[Controller] getEtfYieldDataService result:`, yieldData ? 'Found data' : 'null/empty');

            const holdingsData = await getEtfHoldingsService(etf_code);
            console.log(`[Controller] getEtfHoldingsService result:`, holdingsData ? `Found ${holdingsData.length} records` : 'null/empty');

            const recommendationData = await getEtfRecommendationScoreService(etf_code);
            console.log(`[Controller] getEtfRecommendationScoreService result:`, recommendationData ? 'Found data' : 'null/empty');

            if (!result || result.length === 0) {
                console.log(`[Controller] No ETF detail data found for: ${etf_code}`);
                return res.status(404).json(
                    failResponse(
                        responseMessage.fail.read.status,
                        "해당 ETF를 찾을 수 없습니다."
                    )
                );
            }

            // ETF 기본 정보와 가격 데이터 분리
            const etfInfo = {
                etf_code: result[0].etf_code,
                etf_name: result[0].etf_name,
                ticker: result[0].ticker,
                provider: result[0].provider,
                asset_class: result[0].asset_class,
                theme: result[0].theme,
                expense_ratio: result[0].expense_ratio,
                is_listed: result[0].is_listed,
                delisted_at: result[0].delisted_at,
                inception_date: result[0].inception_date,
                currency: result[0].currency,
                created_at: result[0].created_at,
                updated_at: result[0].updated_at,
                is_retire_pension: result[0].is_retire_pension,
                is_personal_pension: result[0].is_personal_pension
            };

            // 가격 데이터만 추출 (새로운 컬럼들 포함)
            const dailyPrices = result
                .filter(row => row.trade_date) // 가격 데이터가 있는 행만
                .map(row => ({
                    trade_date: row.trade_date,
                    open_price: row.open_price,
                    high_price: row.high_price,
                    low_price: row.low_price,
                    close_price: row.close_price,
                    volume: row.volume,
                    nav_price: row.nav_price,
                    change_rate: row.change_rate,
                    aum: row.aum,
                    cmp_prev_dd_price: row.cmp_prev_dd_price,
                    acc_trd_val: row.acc_trd_val,
                    mkt_cap: row.mkt_cap,
                    list_shrs: row.list_shrs,
                    idx_ind_nm: row.idx_ind_nm,
                    obj_stk_prc_idx: row.obj_stk_prc_idx,
                    cmp_prev_dd_idx: row.cmp_prev_dd_idx,
                    fluc_rt1: row.fluc_rt1
                }));

            const responseData = {
                ...etfInfo,
                daily_prices: dailyPrices,
                yield_data: yieldData,
                holdings_data: holdingsData,
                recommendation_data: recommendationData
            };

            console.log('[Controller] Final responseData structure:', Object.keys(responseData));
            console.log('[Controller] holdings_data length:', holdingsData ? holdingsData.length : 'null');
            console.log('[Controller] recommendation_data:', recommendationData ? 'Found' : 'null');

            res.json(
                successResponse(
                    responseMessage.success.read.status,
                    responseMessage.success.read.message,
                    responseData
                )
            );
        } catch (error) {
            console.log("ETF 상세 정보 조회 실패: ", error);
            res.status(500).json(
                failResponse(
                    responseMessage.fail.read.status,
                    responseMessage.fail.read.message
                )
            );
        }
    },


};

module.exports = etfDetailController;
