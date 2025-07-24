// services/goalPlannerService.js
const pool = require("../common/database");
const { getGoalPlanDao } = require("../dao/goalPlannerDao");
const {
  SimpleMonteCarloEngine,
} = require("./goalPlannerEngine/SimpleMonteCarloEngine");
const config = require("../config/goalPlanner");

const calculateGoalPlanService = async (input) => {
  console.log("🔧 Goal Planner Service 시작:", input);

  const connection = await pool.connect();
  try {
    console.log(
      "📊 ETF 데이터 조회 시작 (시가총액 상위",
      config.etfLimit,
      "개)"
    );
    const etfData = await getGoalPlanDao(connection, config.etfLimit);
    console.log("📊 ETF 데이터 조회 완료, 개수:", etfData.length);

    console.log("🚀 Monte Carlo 시뮬레이션 엔진 시작");
    const engine = new SimpleMonteCarloEngine();
    const result = await engine.simulate(input, etfData, connection);
    console.log("✅ Monte Carlo 시뮬레이션 완료");

    console.log("🔍 최종 결과 확인:", {
      recommendationsCount: result.recommendations?.length,
      firstEtf: result.recommendations?.[0]?.etf_code,
      firstSuccessRate: result.recommendations?.[0]?.success_rate,
      firstGoalScore: result.recommendations?.[0]?.goal_score,
    });

    return result;
  } catch (error) {
    console.log("❌ Service 에러:", error);
    throw error;
  } finally {
    connection.release();
  }
};

// Monte Carlo 전용 서비스 (기존 함수와 동일)
const calculateMonteCarloGoalPlanService = async (input) => {
  console.log("🎲 Monte Carlo Goal Planner Service 시작:", input);
  return await calculateGoalPlanService(input);
};

// Five Year Engine 전용 서비스 (더 이상 사용하지 않음)
const calculateFiveYearGoalPlanService = async (input) => {
  console.log(
    "⚠️ Five Year Engine은 더 이상 지원되지 않습니다. Monte Carlo로 대체합니다."
  );
  return await calculateGoalPlanService(input);
};

module.exports = {
  calculateGoalPlanService,
  calculateMonteCarloGoalPlanService,
  calculateFiveYearGoalPlanService,
};
