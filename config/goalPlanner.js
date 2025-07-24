const goalPlannerConfig = {
  maxYears: 5,
  dataHorizonMonths: 60,
  windowLimit: 40, // 히트율 창 (기존 FiveYearEngine용)
  etfLimit: 992, // 시가총액 상위 N
  contributionTiming: "end",

  // Monte Carlo 시뮬레이션 설정은 monteCarloConfig에서 관리
  // 중복 제거: monteCarloConfig를 참조하여 사용
};

module.exports = goalPlannerConfig;
