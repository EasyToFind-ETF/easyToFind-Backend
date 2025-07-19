const pool = require("../common/database");
const { getGoalPlanDao } = require("../dao/goalPlannerDao");
const {
  FiveYearEngine,
} = require("../services/goalPlannerEngine/FiveYearEngine");

// services/goalPlannerService.js
const calculateGoalPlanService = async (input) => {
  console.log("🔧 Goal Planner Service 시작:", input);

  const connection = await pool.connect();
  try {
    console.log("📊 ETF 데이터 조회 시작");
    const etfData = await getGoalPlanDao(connection);
    console.log("📊 ETF 데이터 조회 완료, 개수:", etfData.length);

    console.log("�� 시뮬레이션 엔진 시작");
    const engine = new FiveYearEngine();
    const result = await engine.simulate(input, etfData);
    console.log("🧮 시뮬레이션 완료");

    return result;
  } catch (error) {
    console.log("❌ Service 에러:", error);
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = { calculateGoalPlanService };
