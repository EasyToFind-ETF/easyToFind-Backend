const goalPlannerConfig = {
  maxYears: 5,
  dataHorizonMonths: 60,
  windowLimit: 40, //히트율 창
  etfLimit: 200, //시가총액 상위 N
  riskMatchSigma: 18, //가우시안 (팀 합의값 넣어야함)
  contributionTiming: "end",
};

module.exports = goalPlannerConfig;
