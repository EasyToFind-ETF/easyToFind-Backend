const { successResponse, failResponse } = require("../common/Response");
const responseMessage = require("../common/responseMessages");
const {
  calculateGoalPlanService,
  calculateMonteCarloGoalPlanService,
  calculateFiveYearGoalPlanService,
} = require("../services/goalPlannerService");
const config = require("../config/goalPlanner");

// controllers/goalPlannerController.js에서
const goalPlannerController = {
  // 기본 API (Monte Carlo 기본값)
  calculateGoalPlan: async (req, res) => {
    console.log("🎯 Goal Planner API 호출됨:", req.body);

    const {
      targetAmount,
      targetYears,
      initialAmount = 0,
      monthlyContribution = 0,
      themePreference = [],
      useMonteCarlo = true, // 기본값: Monte Carlo 사용
    } = req.body;

    try {
      // 입력 검증
      if (!targetAmount || targetAmount <= 0) {
        return res.status(400).json({
          error: "목표 금액은 0보다 커야 합니다.",
        });
      }

      if (
        !Number.isInteger(targetYears) ||
        targetYears < 1 ||
        targetYears > config.maxYears
      ) {
        return res.status(400).json({
          error: `현재는 1~${config.maxYears}년만 지원합니다. (추후 확장 예정)`,
        });
      }

      if (monthlyContribution < 0) {
        return res.status(400).json({
          error: "월 납입액은 0 이상이어야 합니다.",
        });
      }

      // 사용자 ID 처리 (로그인 여부에 따라)
      const userId = req.user ? req.user.user_id : null;
      console.log("사용자 ID:", userId || "비로그인 사용자");

      console.log("✅ 입력 검증 통과, 서비스 호출 시작");

      const result = await calculateGoalPlanService({
        targetAmount,
        targetYears,
        initialAmount,
        monthlyContribution,
        riskProfile: userId,
        themePreference,
        useMonteCarlo,
      });

      console.log("✅ 서비스 완료, 결과:", {
        recommendationsCount: result.recommendations.length,
        simulationMethod: result.meta.simulationMethod || "Five Year Engine",
        simulationCount: result.meta.simulationCount || "N/A",
      });

      // 결과에 추가 정보 포함
      const enhancedResult = {
        ...result,
        analysis: {
          // 실제 메타데이터만 포함
          simulationDetails: {
            totalScenarios: result.meta.simulationCount || 0,
            confidenceLevel: result.meta.confidenceLevel || 95,
            calculationTime: result.meta.calculationTime || 0,
            requiredReturn: result.meta.requiredCAGR || 0,
          },
        },
      };

      res.json(enhancedResult);
    } catch (error) {
      console.error("❌ Goal Planner API 에러:", error);
      res.status(500).json({
        error: "목표 기반 ETF 추천 중 오류가 발생했습니다.",
        details: error.message,
      });
    }
  },

  // Monte Carlo 전용 API
  calculateMonteCarloGoalPlan: async (req, res) => {
    console.log("🎲 Monte Carlo Goal Planner API 호출됨:", req.body);

    // 타임아웃 설정 (5분)
    const timeout = setTimeout(
      () => {
        console.error("⏰ Monte Carlo API 타임아웃 (5분 초과)");
        if (!res.headersSent) {
          res.status(408).json({
            error:
              "Monte Carlo 시뮬레이션이 시간 초과되었습니다. 시뮬레이션 횟수를 줄이거나 Five Year Engine을 사용해주세요.",
            suggestion: "useMonteCarlo: false로 설정하여 기존 방식 사용",
          });
        }
      },
      5 * 60 * 1000
    ); // 5분

    const {
      targetAmount,
      targetYears,
      initialAmount = 0,
      monthlyContribution = 0,
      themePreference = [],
    } = req.body;

    try {
      // 입력 검증
      if (!targetAmount || targetAmount <= 0) {
        clearTimeout(timeout);
        return res.status(400).json({
          error: "목표 금액은 0보다 커야 합니다.",
        });
      }

      if (
        !Number.isInteger(targetYears) ||
        targetYears < 1 ||
        targetYears > config.maxYears
      ) {
        clearTimeout(timeout);
        return res.status(400).json({
          error: `현재는 1~${config.maxYears}년만 지원합니다.`,
        });
      }

      if (monthlyContribution < 0) {
        clearTimeout(timeout);
        return res.status(400).json({
          error: "월 납입액은 0 이상이어야 합니다.",
        });
      }

      const userId = req.user ? req.user.user_id : null;
      console.log("사용자 ID:", userId || "비로그인 사용자");

      console.log("✅ 입력 검증 통과, Monte Carlo 서비스 호출 시작");

      const result = await calculateMonteCarloGoalPlanService({
        targetAmount,
        targetYears,
        initialAmount,
        monthlyContribution,
        riskProfile: userId,
        themePreference,
      });

      clearTimeout(timeout); // 성공 시 타임아웃 해제

      console.log("✅ Monte Carlo 서비스 완료, 결과:", {
        recommendationsCount: result.recommendations.length,
        simulationCount: result.meta.simulationCount,
      });

      const enhancedResult = {
        ...result,
        analysis: {
          // 실제 메타데이터만 포함
          simulationDetails: {
            totalScenarios: result.meta.simulationCount || 0,
            confidenceLevel: result.meta.confidenceLevel || 95,
            calculationTime: result.meta.calculationTime || 0,
            requiredReturn: result.meta.requiredCAGR || 0,
          },
        },
      };

      res.json(enhancedResult);
    } catch (error) {
      clearTimeout(timeout); // 에러 시 타임아웃 해제
      console.error("❌ Monte Carlo Goal Planner API 에러:", error);
      res.status(500).json({
        error: "Monte Carlo 목표 기반 ETF 추천 중 오류가 발생했습니다.",
        details: error.message,
      });
    }
  },

  // Five Year Engine 전용 API
  calculateFiveYearGoalPlan: async (req, res) => {
    console.log("🧮 Five Year Engine Goal Planner API 호출됨:", req.body);

    const {
      targetAmount,
      targetYears,
      initialAmount = 0,
      monthlyContribution = 0,
      themePreference = [],
    } = req.body;

    try {
      // 입력 검증
      if (!targetAmount || targetAmount <= 0) {
        return res.status(400).json({
          error: "목표 금액은 0보다 커야 합니다.",
        });
      }

      if (
        !Number.isInteger(targetYears) ||
        targetYears < 1 ||
        targetYears > config.maxYears
      ) {
        return res.status(400).json({
          error: `현재는 1~${config.maxYears}년만 지원합니다.`,
        });
      }

      if (monthlyContribution < 0) {
        return res.status(400).json({
          error: "월 납입액은 0 이상이어야 합니다.",
        });
      }

      const userId = req.user ? req.user.user_id : null;
      console.log("사용자 ID:", userId || "비로그인 사용자");

      console.log("✅ 입력 검증 통과, Five Year Engine 서비스 호출 시작");

      const result = await calculateFiveYearGoalPlanService({
        targetAmount,
        targetYears,
        initialAmount,
        monthlyContribution,
        riskProfile: userId,
        themePreference,
      });

      console.log("✅ Five Year Engine 서비스 완료, 결과:", {
        recommendationsCount: result.recommendations.length,
        windowCount: result.meta.windowCount,
      });

      const enhancedResult = {
        ...result,
        analysis: {
          // 실제 메타데이터만 포함
          simulationDetails: {
            totalScenarios: result.meta.windowCount || 0,
            confidenceLevel: result.meta.confidenceLevel || 90,
            calculationTime: result.meta.calculationTime || 0,
            requiredReturn: result.meta.requiredCAGR || 0,
          },
        },
      };

      res.json(enhancedResult);
    } catch (error) {
      console.error("❌ Five Year Engine Goal Planner API 에러:", error);
      res.status(500).json({
        error: "Five Year Engine 목표 기반 ETF 추천 중 오류가 발생했습니다.",
        details: error.message,
      });
    }
  },
};

module.exports = goalPlannerController;
