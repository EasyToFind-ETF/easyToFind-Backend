// routes/goalPlannerRouter.js
const express = require('express');
const {
  calculateGoalPlan,
  calculateMonteCarloGoalPlan,
  calculateFiveYearGoalPlan,
} = require('../controllers/goalPlannerController');

const router = express.Router();

// 모든 요청에 대한 로그
router.use((req, res, next) => {
  console.log(`🎯 ${req.method} ${req.path} 요청 도착 - ${new Date().toISOString()}`);
  next();
});

// OPTIONS 요청 처리
router.options('/', (req, res) => {
  console.log('✅ OPTIONS 요청 처리 완료');
  res.status(200).end();
});

router.options('/monte-carlo', (req, res) => {
  console.log('✅ OPTIONS /monte-carlo 요청 처리 완료');
  res.status(200).end();
});

router.options('/five-year', (req, res) => {
  console.log('✅ OPTIONS /five-year 요청 처리 완료');
  res.status(200).end();
});

// 기본 API (Monte Carlo 기본값)
router.post('/', (req, res) => {
  console.log(' POST 요청 처리 시작');
  console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
  console.log('사용자 정보:', req.user);

  try {
    calculateGoalPlan(req, res);
  } catch (error) {
    console.log('❌ 라우터에서 에러 발생:', error);
    res.status(500).json({ error: error.message });
  }
});

// Monte Carlo 전용 API
router.post('/monte-carlo', (req, res) => {
  console.log('🎲 POST /monte-carlo 요청 처리 시작');
  console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
  console.log('사용자 정보:', req.user);

  try {
    calculateMonteCarloGoalPlan(req, res);
  } catch (error) {
    console.log('❌ Monte Carlo 라우터에서 에러 발생:', error);
    res.status(500).json({ error: error.message });
  }
});

// Five Year Engine 전용 API
router.post('/five-year', (req, res) => {
  console.log('🧮 POST /five-year 요청 처리 시작');
  console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
  console.log('사용자 정보:', req.user);

  try {
    calculateFiveYearGoalPlan(req, res);
  } catch (error) {
    console.log('❌ Five Year 라우터에서 에러 발생:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
