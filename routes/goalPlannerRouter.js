// routes/goalPlannerRouter.js
const express = require("express");
const { calculateGoalPlan } = require("../controllers/goalPlannerController");

const router = express.Router();

// 모든 요청에 대한 로그
router.use((req, res, next) => {
  console.log(
    `🎯 ${req.method} ${req.path} 요청 도착 - ${new Date().toISOString()}`
  );
  next();
});

// OPTIONS 요청 처리
router.options("/", (req, res) => {
  console.log("✅ OPTIONS 요청 처리 완료");
  res.status(200).end();
});

router.post("/", (req, res) => {
  console.log(" POST 요청 처리 시작");
  console.log("📝 Request body:", JSON.stringify(req.body, null, 2));

  try {
    calculateGoalPlan(req, res);
  } catch (error) {
    console.log("❌ 라우터에서 에러 발생:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET 요청 추가 (테스트용)
router.get("/", (req, res) => {
  console.log("🎯 GET 요청 도착!");
  res.json({
    message: "Goal Planner API is working!",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
