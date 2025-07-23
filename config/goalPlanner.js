const goalPlannerConfig = {
  maxYears: 5,
  dataHorizonMonths: 60,
  windowLimit: 40, // 히트율 창
  etfLimit: 900, // 시가총액 상위 N
  contributionTiming: "end",
};

module.exports = goalPlannerConfig;
