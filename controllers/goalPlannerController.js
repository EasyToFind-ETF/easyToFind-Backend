const { successResponse, failResponse } = require("../common/Response");
const responseMessage = require("../common/responseMessages");
const { calculateGoalPlanService } = require("../services/goalPlannerService");
const config = require("../config/goalPlanner");

// controllers/goalPlannerController.js에서
const goalPlannerController = {
  calculateGoalPlan: async (req, res) => {
    console.log("Goal Planner API 호출됨:", req.body);

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
        riskProfile: userId, // null이면 기본 가중치 사용
        themePreference,
      });

      console.log("✅ 서비스 완료, 결과:", result);

      // successResponse 제거하고 직접 반환
      res.json(result);
    } catch (error) {
      console.log("❌ Goal Planner 계산 실패: ", error);
      res.status(500).json({
        error: "목표 설계 계산 중 오류가 발생했습니다.",
      });
    }
  },
};

module.exports = goalPlannerController;
