const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const sequelize = require("./config/database"); // Sequelize 인스턴스 import
const authMiddleware = require("./middleware/authMiddleware"); // 경로에 따라 조정

// ETF 캐싱 스케줄러 import
require("./services/schedulerService/etfCachingScheduler");

sequelize
  .sync() // 테이블 자동 생성 or 동기화
  .then(() => {
    // console.log("📦 Sequelize DB sync 완료");
  })
  .catch((err) => {
    console.error("❌ DB sync 실패:", err);
  });

const mainRouter = require("./routes/mainRouter");
const saveTestResultRouter = require("./routes/saveTestResultRouter");
const etfFindRouter = require("./routes/etfFindRouter");
const holdingFindRouter = require("./routes/holdingFindRouter");
const etfCompareRouter = require("./routes/etfCompareRouter");

const getTestResultRouter = require("./routes/getTestResult");
const getTestThemeRouter = require("./routes/getTestThemeRouter");
const userRouter = require("./routes/userRouter");
const etfDetailRouter = require("./routes/etfDetailRouter");
const goalPlannerRouter = require("./routes/goalPlannerRouter");
const etfFavoriteRouter = require("./routes/etfFavoriteRouter");
const userMypageRouter = require("./routes/userMypageRouter");
const getMainTrendRouter = require("./routes/getMainTrendRouter");
const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// CORS 설정
app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // 프론트엔드 주소, 나중에 env로 관리
    credentials: true, // 쿠키 허용
  })
);

/**
 * router 등록
 */
app.use("/main", mainRouter);
app.use("/api/me/mbti", saveTestResultRouter);
app.use("/api/etfs", etfFindRouter);
app.use("/api/holdings", holdingFindRouter);
app.use("/api/etf/compare", etfCompareRouter);
app.use("/api/recommendation", getTestResultRouter);
app.use("/api/recommendation/theme", getTestThemeRouter);
app.use("/api/auth", userRouter);
app.use("/api/goal-planner", goalPlannerRouter);
app.use("/api/etfs", etfDetailRouter);
app.use("/api/me", etfFavoriteRouter);
app.use("/api/me/mypage", userMypageRouter)
app.use("/api/main", getMainTrendRouter);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
});

module.exports = app;
