const express = require("express");
const { getEtfFindPage } = require("../controllers/etfFindController");
const verifyToken = require("../middlewares/verifyToken");

const router = express.Router();

router.get("/", (req, res, next) => {
  console.log("🚏 [Router] /api/etfs 요청 도착");

  const isFavorite = req.query.isFavorite;

  if (isFavorite === "true") {
    verifyToken(req, res, () => getEtfFindPage(req, res));
  } else {
    getEtfFindPage(req, res);
  }
});

// ETF 캐싱 수동 실행 엔드포인트
router.post("/cache/update", async (req, res) => {
  const startTime = Date.now();

  try {
    console.log("🔄 수동 캐싱 시작...");

    // 5분 타임아웃 설정
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("요청 시간 초과 (5분)")),
        5 * 60 * 1000
      );
    });

    const cachePromise = (async () => {
      const updateEtfCache = require("../services/schedulerService/etfCaching");
      await updateEtfCache();
    })();

    await Promise.race([cachePromise, timeoutPromise]);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`✅ 수동 캐싱 완료! (${duration}초 소요)`);
    res.json({ message: `✅ ETF 캐시 업데이트 완료! (${duration}초 소요)` });
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.error(`❌ 수동 캐싱 실패 (${duration}초 후):`, error.message);
    res.status(500).json({
      error: "캐시 업데이트 실패",
      message: error.message,
      duration: `${duration}초`,
    });
  }
});

// ETF 구성종목 데이터 수집 수동 실행 엔드포인트
router.post("/holdings/update", async (req, res) => {
  const startTime = Date.now();

  try {
    console.log("🔄 ETF 구성종목 데이터 수집 시작...");

    // 10분 타임아웃 설정 (구성종목 수집은 더 오래 걸릴 수 있음)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("요청 시간 초과 (10분)")),
        10 * 60 * 1000
      );
    });

    const holdingsPromise = (async () => {
      const collectEtfHoldings = require("../services/etfHoldingsService");
      await collectEtfHoldings();
    })();

    await Promise.race([holdingsPromise, timeoutPromise]);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`✅ ETF 구성종목 데이터 수집 완료! (${duration}초 소요)`);
    res.json({
      message: `✅ ETF 구성종목 데이터 수집 완료! (${duration}초 소요)`,
    });
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.error(
      `❌ ETF 구성종목 데이터 수집 실패 (${duration}초 후):`,
      error.message
    );
    res.status(500).json({
      error: "ETF 구성종목 데이터 수집 실패",
      message: error.message,
      duration: `${duration}초`,
    });
  }
});

// ETF 일별 데이터 수집 수동 실행 엔드포인트
router.post("/daily/update", async (req, res) => {
  const startTime = Date.now();

  try {
    console.log("🔄 ETF 일별 데이터 수집 시작...");

    // 15분 타임아웃 설정 (일별 데이터 수집은 매우 오래 걸릴 수 있음)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("요청 시간 초과 (15분)")),
        15 * 60 * 1000
      );
    });

    const dailyPromise = (async () => {
      const collectEtfDailyData = require("../services/etfPricesDailyService");
      await collectEtfDailyData();
    })();

    await Promise.race([dailyPromise, timeoutPromise]);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`✅ ETF 일별 데이터 수집 완료! (${duration}초 소요)`);
    res.json({ message: `✅ ETF 일별 데이터 수집 완료! (${duration}초 소요)` });
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.error(
      `❌ ETF 일별 데이터 수집 실패 (${duration}초 후):`,
      error.message
    );
    res.status(500).json({
      error: "ETF 일별 데이터 수집 실패",
      message: error.message,
      duration: `${duration}초`,
    });
  }
});

module.exports = router;
