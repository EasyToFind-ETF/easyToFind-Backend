const goalPlannerConfig = {
  maxYears: 5,
  dataHorizonMonths: 60,
  windowLimit: 40, // 히트율 창 (기존 FiveYearEngine용)
  etfLimit: 900, // 시가총액 상위 N
  contributionTiming: 'end',

  // Monte Carlo 시뮬레이션 설정
  monteCarlo: {
    simulations: 1000, // 시뮬레이션 횟수 (10,000 → 1,000으로 줄임)
    riskFreeRate: 0.02, // 무위험 수익률 (2%)
    extremeEventProbability: 0.005, // 극단적 이벤트 확률 (0.5%)
    volatilityClusteringFactor: 0.1, // 변동성 클러스터링 계수
    tradingDaysPerYear: 252, // 연간 거래일
    tradingDaysPerMonth: 21, // 월간 거래일

    // SimpleMonteCarlo 개선 설정
    simple: {
      simulations: 100, // SimpleMonteCarlo용 시뮬레이션 횟수
      etfProcessingLimit: 50, // 처리할 ETF 수 제한
      enableMarketRegimeAnalysis: true, // 시장 상황 분석 활성화
      enableDynamicVolatility: true, // 동적 변동성 활성화
      enableEnhancedRandomFactors: true, // 개선된 랜덤 팩터 활성화
      enableDataQualityAssessment: true, // 데이터 품질 평가 활성화

      // 시장 상황별 설정
      marketRegime: {
        bull: {
          returnMultiplier: 1.2,
          volatilityMultiplier: 0.8,
          minReturn: 0.03,
          maxVolatility: 0.4,
        },
        bear: {
          returnMultiplier: 0.8,
          volatilityMultiplier: 1.3,
          minReturn: -0.05,
          maxVolatility: 0.8,
        },
        volatile: {
          returnMultiplier: 0.9,
          volatilityMultiplier: 1.5,
          minReturn: 0.01,
          maxVolatility: 0.8,
        },
        neutral: {
          returnMultiplier: 1.0,
          volatilityMultiplier: 1.0,
          minReturn: 0.02,
          maxVolatility: 0.6,
        },
      },

      // 데이터 품질 평가 기준
      dataQuality: {
        minDataPoints: 30, // 최소 데이터 포인트
        completenessThreshold: 0.5, // 완성도 임계값
        continuityThreshold: 0.8, // 연속성 임계값
        stabilityThreshold: 0.5, // 안정성 임계값
      },

      // 위험 지표 설정
      riskMetrics: {
        varConfidenceLevel: 0.05, // VaR 신뢰수준 (5%)
        maxDrawdownThreshold: 0.3, // 최대 낙폭 임계값 (30%)
        sharpeRatioThreshold: 0.5, // 샤프 비율 임계값
        riskAdjustedReturnWeight: 0.3, // 위험 조정 수익률 가중치
        successRateWeight: 0.5, // 성공률 가중치
        personalScoreWeight: 0.2, // 개인화 점수 가중치
      },
    },
  },

  // 위험 지표 설정
  riskMetrics: {
    varConfidenceLevel: 0.05, // VaR 신뢰수준 (5%)
    maxDrawdownThreshold: 0.3, // 최대 낙폭 임계값 (30%)
    sharpeRatioThreshold: 0.5, // 샤프 비율 임계값
  },
};

module.exports = goalPlannerConfig;
