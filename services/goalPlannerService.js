// services/goalPlannerService.js
const pool = require('../common/database');
const { getGoalPlanDao } = require('../dao/goalPlannerDao');
const { FiveYearEngine } = require('./goalPlannerEngine/FiveYearEngine');
const { MonteCarloEngine } = require('./goalPlannerEngine/MonteCarloEngine');
const { SimpleMonteCarloEngine } = require('./goalPlannerEngine/SimpleMonteCarloEngine');
const config = require('../config/goalPlanner');

const calculateGoalPlanService = async (input) => {
  console.log('🔧 Goal Planner Service 시작:', input);

  const connection = await pool.connect();
  try {
    console.log('📊 ETF 데이터 조회 시작 (시가총액 상위', config.etfLimit, '개)');
    const etfData = await getGoalPlanDao(connection, config.etfLimit);
    console.log('📊 ETF 데이터 조회 완료, 개수:', etfData.length);

    // 엔진 선택 (기본값: Simple Monte Carlo로 임시 변경)
    const useMonteCarlo = input.useMonteCarlo !== false; // 기본값 true

    console.log('🎯 엔진 선택:', { useMonteCarlo, inputUseMonteCarlo: input.useMonteCarlo });

    let engine;
    let result;

    if (useMonteCarlo) {
      console.log('🚀 Simple Monte Carlo 시뮬레이션 엔진 시작 (테스트용)');
      console.log('🔍 SimpleMonteCarloEngine import 확인:', typeof SimpleMonteCarloEngine);
      engine = new SimpleMonteCarloEngine();
      console.log('🔍 엔진 인스턴스 생성 완료:', engine.constructor.name);
      result = await engine.simulate(input, etfData, connection);
      console.log('✅ Simple Monte Carlo 시뮬레이션 완료');
    } else {
      console.log('🧮 Five Year Engine 시작 (기존 방식)');
      engine = new FiveYearEngine();
      result = await engine.simulate(input, etfData, connection);
      console.log('✅ Five Year Engine 시뮬레이션 완료');
    }

    console.log('🔍 최종 결과 확인:', {
      recommendationsCount: result.recommendations?.length,
      firstEtf: result.recommendations?.[0]?.etf_code,
      firstSuccessRate: result.recommendations?.[0]?.success_rate,
      firstGoalScore: result.recommendations?.[0]?.goal_score,
    });

    return result;
  } catch (error) {
    console.log('❌ Service 에러:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Monte Carlo 전용 서비스
const calculateMonteCarloGoalPlanService = async (input) => {
  input.useMonteCarlo = true;
  return await calculateGoalPlanService(input);
};

// 기존 Five Year Engine 전용 서비스
const calculateFiveYearGoalPlanService = async (input) => {
  input.useMonteCarlo = false;
  return await calculateGoalPlanService(input);
};

module.exports = {
  calculateGoalPlanService,
  calculateMonteCarloGoalPlanService,
  calculateFiveYearGoalPlanService,
};
