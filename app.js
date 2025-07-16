const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");

const mainRouter = require("./routes/mainRouter");
const saveTestResultRouter = require("./routes/saveTestResultRouter");
const etfFindRouter = require("./routes/etfFindRouter");

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
