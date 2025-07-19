const cron = require("node-cron");

cron.schedule("0 1 * * *", async () => {
  console.log("🌙 [CRON] 매일 오전 1시에 캐싱 시작!");
  try {
    const cachingFn = require("./etfCaching");
    await cachingFn(); // etfCaching.js가 함수 export 한다고 가정
    console.log("✅ 캐싱 완료!");
  } catch (err) {
    console.error("❌ 캐싱 중 에러 발생:", err);
  }
});
