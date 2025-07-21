const { successResponse, failResponse } = require("../common/Response");
const responseMessage = require("../common/responseMessages");
const { calculateGoalPlanService } = require("../services/goalPlannerService");
const {
  getUserRiskProfileService,
} = require("../services/userRiskProfileService");
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

      let riskProfile = 50;

      if (req.user) {
        console.log("로그인 된 사용자 ID:", req.user.user_id);
        const userRiskScore = await getUserRiskProfileService(req.user.user_id);

        if (userRiskScore !== null) {
          riskProfile = Math.round((userRiskScore / 30) * 100);
          console.log(
            "사용자 위험 성향 점수:",
            userRiskScore,
            "-> 변환:",
            riskProfile
          );
        } else {
          console.log("사용자 위험 성향 정보 없음, 기본값 사용");
        }
      } else {
        console.log("비로그인 사용자, 기본 위험 성향 사용");
      }

      console.log("✅ 입력 검증 통과, 서비스 호출 시작");
      console.log("🎯 최종 위험 성향:", riskProfile);

      const result = await calculateGoalPlanService({
        targetAmount,
        targetYears,
        initialAmount,
        monthlyContribution,
        riskProfile,
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
