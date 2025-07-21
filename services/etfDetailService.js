const { getEtfDetailDao, getEtfYieldDao, getEtfHoldingsDao, getEtfRecommendationScoreDao } = require("../dao/etfDetailDao");

const getEtfDetailService = async (etfCode) => {
    try {
        const result = await getEtfDetailDao(etfCode);
        return result;
    } catch (error) {
        console.error("ETF 상세 정보 조회 서비스 에러:", error);
        throw error;
    }
};

const getEtfYieldDataService = async (etfCode) => {
    try {
        const yieldData = await getEtfYieldDao(etfCode);
        return yieldData;
    } catch (error) {
        console.error("ETF 수익률 데이터 조회 서비스 에러:", error);
        throw error;
    }
};

const getEtfHoldingsService = async (etfCode, date = null) => {
    try {
        const holdingsData = await getEtfHoldingsDao(etfCode, date);
        return holdingsData;
    } catch (error) {
        console.error("ETF 보유 종목 데이터 조회 서비스 에러:", error);
        throw error;
    }
};

const getEtfRecommendationScoreService = async (etfCode) => {
    try {
        const recommendationData = await getEtfRecommendationScoreDao(etfCode);
        return recommendationData;
    } catch (error) {
        console.error("ETF 추천 점수 데이터 조회 서비스 에러:", error);
        throw error;
    }
};

module.exports = {
    getEtfDetailService,
    getEtfYieldDataService,
    getEtfHoldingsService,
    getEtfRecommendationScoreService,
}; 