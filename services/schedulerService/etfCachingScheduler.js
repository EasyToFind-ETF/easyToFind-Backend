const cron = require("node-cron");

// ETF 수익률 캐싱 스케줄러 (매일 새벽 1시)
cron.schedule("0 1 * * *", async () => {
  console.log("🌙 [CRON] 매일 오전 1시에 ETF 캐싱 시작!");
  try {
    const updateEtfCache = require("./etfCaching");
    await updateEtfCache();
    console.log("✅ ETF 캐싱 완료!");
  } catch (err) {
    console.error("❌ ETF 캐싱 중 에러 발생:", err);
  }
});

// ETF 일별 가격 데이터 수집 스케줄러 (매일 새벽 1시 30분)
cron.schedule("30 1 * * *", async () => {
  console.log("🌙 [CRON] 매일 오전 1시 30분에 ETF 일별 데이터 수집 시작!");
  try {
    const collectEtfDailyData = require("../etfPricesDailyService");
    await collectEtfDailyData();
    console.log("✅ ETF 일별 데이터 수집 완료!");
  } catch (err) {
    console.error("❌ ETF 일별 데이터 수집 중 에러 발생:", err);
  }
});

// ETF 구성종목 데이터 수집 스케줄러 (매일 새벽 2시)
cron.schedule("0 2 * * *", async () => {
  console.log("🌙 [CRON] 매일 오전 2시에 ETF 구성종목 데이터 수집 시작!");
  try {
    const collectEtfHoldings = require("../etfHoldingsService");
    await collectEtfHoldings();
    console.log("✅ ETF 구성종목 데이터 수집 완료!");
  } catch (err) {
    console.error("❌ ETF 구성종목 데이터 수집 중 에러 발생:", err);
  }
});

console.log("📅 ETF 스케줄러들이 등록되었습니다:");
console.log("   - ETF 캐싱: 매일 오전 1시");
console.log("   - ETF 일별 데이터 수집: 매일 오전 1시 30분");
console.log("   - ETF 구성종목 데이터 수집: 매일 오전 2시");
