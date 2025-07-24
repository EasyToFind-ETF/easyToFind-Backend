// services/goalPlannerEngine/MonteCarloEngine.js
const { GoalSimEngine } = require("./GoalSimEngine");
const { getConfig } = require("../../config/monteCarlo");
const { getPersonalScoreMap } = require("../../dao/riskMetricsDao");
const { createSeededRng } = require("../../utils/random");
const { generateEtfUserSeed } = require("../../utils/hash");
const { mean, sharpeRatio, wilsonCI } = require("../../utils/stats");

class MonteCarloEngine extends GoalSimEngine {
  async simulate(input, etfData, connection) {
    const startTime = Date.now(); // 시작 시간 측정

    const {
      targetAmount,
      targetYears,
      initialAmount,
      monthlyContribution,
      riskProfile, // userId
      themePreference,
    } = input;

    const targetDays = targetYears * 252; // 연간 거래일 약 252일
    const simulations = 2000; // 몬테카를로 시뮬레이션 횟수 (2000개로 통일)

    console.log("🎲 Monte Carlo 시뮬레이션 시작:", {
      etfCount: etfData.length,
      targetDays,
      simulations,
      userId: riskProfile,
    });

    // 1) 개인화 점수 맵 로드
    const personalMap = await getPersonalScoreMap(connection, riskProfile);
    console.log(
      "📊 개인화 점수 맵 로드 완료:",
      Object.keys(personalMap).length
    );

    const results = [];

    for (const etf of etfData) {
      if (etf.prices.length < 252) continue; // 최소 1년 데이터 필요

      console.log(`🔄 ETF 처리 중: ${etf.etf_code} (${etf.etf_name})`);

      // 2) 일별 통계 추출
      const dailyStats = this.extractDailyStatistics(etf.prices);
      console.log(`📊 ${etf.etf_code} 통계:`, {
        mean: dailyStats.mean.toFixed(6),
        volatility: dailyStats.volatility.toFixed(6),
        dataPoints: dailyStats.dataPoints,
      });

      // 3) 몬테카를로 시나리오 생성
      console.log(`🎲 ${etf.etf_code} 시나리오 생성 시작...`);
      const scenarios = this.generateMonteCarloScenarios(
        dailyStats,
        targetDays,
        simulations,
        etf.etf_code,
        riskProfile
      );
      console.log(
        `✅ ${etf.etf_code} 시나리오 생성 완료: ${scenarios.length}개`
      );

      // 4) 각 시나리오에서 DCA 시뮬레이션
      console.log(`💰 ${etf.etf_code} DCA 시뮬레이션 시작...`);
      const simulationResults = scenarios.map((scenario, index) => {
        if (index % 200 === 0) {
          console.log(
            `  진행률: ${index}/${scenarios.length} (${Math.round(
              (index / scenarios.length) * 100
            )}%)`
          );
        }
        return {
          finalValue: this.dcaSimDaily(
            scenario,
            initialAmount,
            monthlyContribution
          ),
          maxDrawdown: this.calculateMaxDrawdown(scenario),
          volatility: this.calculateVolatility(scenario),
          sharpeRatio: this.calculateSharpeRatio(scenario, 0.02), // 무위험 수익률 2% 가정
        };
      });
      console.log(`✅ ${etf.etf_code} DCA 시뮬레이션 완료`);

      // 5) 종합 분석
      const analysis = this.comprehensiveAnalysis(
        simulationResults,
        targetAmount,
        initialAmount,
        targetYears,
        monthlyContribution
      );

      // 개별 ETF 성공률 신뢰구간 계산 (Wilson CI 방식)
      const successCount = Math.round(
        (analysis.successRate * simulations) / 100
      );
      const { low, mid, high } = wilsonCI(successCount, simulations);

      console.log(`📈 ${etf.etf_code} 분석 완료:`, {
        successRate: analysis.successRate.toFixed(2) + "%",
        confidenceInterval: `${low.toFixed(1)}% - ${high.toFixed(1)}%`,
        expectedValue: Math.round(analysis.expectedValue).toLocaleString(),
        volatility: (analysis.volatility * 100).toFixed(2) + "%",
      });

      // 6) 개인화 점수
      const personalScore = personalMap[etf.etf_code] ?? 50;

      // 7) 최종 점수 계산 (성공률 60% + 개인화 점수 40%)
      const goalScore = parseFloat(
        (analysis.successRate * 0.6 + personalScore * 0.4).toFixed(2)
      );

      results.push({
        etf_code: etf.etf_code,
        etf_name: etf.etf_name,
        asset_class: etf.asset_class,
        theme: etf.theme,
        success_rate: parseFloat(analysis.successRate.toFixed(1)),
        expected_value: Math.round(analysis.expectedValue), // 원단위는 정수로
        volatility: parseFloat((analysis.volatility * 100).toFixed(1)), // 퍼센트, 소수점 첫째자리
        max_drawdown: parseFloat((analysis.maxDrawdown * 100).toFixed(1)), // 퍼센트, 소수점 첫째자리
        sharpe_ratio: parseFloat(analysis.sharpeRatio.toFixed(1)), // 소수점 첫째자리
        var_95: Math.round(analysis.var95), // 원단위는 정수로
        cvar_95: Math.round(analysis.cvar95), // 원단위는 정수로
        personal_score: personalScore,
        goal_score: goalScore,
        confidence_intervals: analysis.confidenceIntervals,
        simulation_count: simulations,
        confidence_interval: {
          low: parseFloat(low.toFixed(1)),
          mid: parseFloat(mid.toFixed(1)),
          high: parseFloat(high.toFixed(1)),
        },
      });
    }

    // 목표 점수 순으로 정렬
    results.sort((a, b) => b.goal_score - a.goal_score);
    const topResults = results.slice(0, 10);

    const endTime = Date.now(); // 종료 시간 측정
    const calculationTime = ((endTime - startTime) / 1000).toFixed(1); // 초 단위

    console.log(
      "✅ Monte Carlo 시뮬레이션 완료:",
      results.length,
      "개 ETF 처리"
    );

    return {
      recommendations: topResults,
      meta: {
        simulationMethod: "Monte Carlo",
        simulationCount: simulations,
        targetDays,
        dataHorizonMonths: getConfig().dataHorizonMonths,
        targetAmount,
        targetYears,
        calculationTime: calculationTime, // "초" 제거
        confidenceLevel: 95, // "%" 제거하고 숫자만
        requiredCAGR: this.requiredCagr(
          targetAmount,
          initialAmount,
          monthlyContribution,
          targetYears
        ),
        config: {
          etfLimit: getConfig().etfLimit,
        },
      },
    };
  }

  // 일별 통계 추출
  extractDailyStatistics(prices) {
    const dailyReturns = this.toDailyLogReturns(prices);

    // 수익률 통계 검증
    console.log("📊 수익률 통계:", {
      mean:
        dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length,
      volatility: Math.sqrt(
        dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
          dailyReturns.length
      ),
      minReturn: Math.min(...dailyReturns),
      maxReturn: Math.max(...dailyReturns),
      dataPoints: dailyReturns.length,
    });

    const mean =
      dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length;
    const variance =
      dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
      dailyReturns.length;
    const volatility = Math.sqrt(variance);

    // 꼬리 위험 측정 (극단적 손익)
    const sortedReturns = dailyReturns.sort((a, b) => a - b);
    const skewness = this.calculateSkewness(dailyReturns, mean, volatility);
    const kurtosis = this.calculateKurtosis(dailyReturns, mean, volatility);

    return {
      mean,
      volatility,
      skewness,
      kurtosis,
      minReturn: sortedReturns[0],
      maxReturn: sortedReturns[sortedReturns.length - 1],
      dataPoints: dailyReturns.length,
    };
  }

  // 몬테카를로 시나리오 생성
  generateMonteCarloScenarios(
    dailyStats,
    targetDays,
    simulations,
    etfCode,
    userId
  ) {
    const { mean, volatility, skewness, kurtosis } = dailyStats;
    const scenarios = [];

    // ETF별 시드 생성
    const seed = this.generateSeed(etfCode, userId);
    const rng = this.createSeededRng(seed);

    for (let i = 0; i < simulations; i++) {
      const scenario = [];
      for (let day = 0; day < targetDays; day++) {
        // 정교한 일별 수익률 생성 (시드 기반)
        const dailyReturn = this.generateRealisticDailyReturn(
          mean,
          volatility,
          skewness,
          kurtosis,
          rng
        );
        scenario.push(dailyReturn);
      }
      scenarios.push(scenario);
    }

    return scenarios;
  }

  // 현실적인 일별 수익률 생성
  generateRealisticDailyReturn(
    mean,
    volatility,
    skewness,
    kurtosis,
    rng = null
  ) {
    // 시드 기반 난수 생성기 또는 기본 Math.random 사용
    const random = rng || Math.random;

    // 1. 기본 정규분포
    let return_ = this.generateNormalRandom(mean, volatility, random);

    // 2. 꼬리 위험 (극단적 이벤트) - 덧셈으로 변경
    if (random() < 0.005) {
      // 0.5% 확률로 극단적 이벤트
      const extremeReturn = this.generateExtremeEvent(skewness);
      return_ += extremeReturn; // 곱셈이 아닌 덧셈으로 변경
    }

    // 3. 변동성 클러스터링 제거 (성능 및 정확성 문제로 인해)
    // return_ *= this.applyVolatilityClustering();

    // 4. 극단값 완전 제거 대신 점진적 완화 → 테일리스크 보존
    // tanh 로 부드럽게 제한: ±15% 이상은 점차 포화 (완화)
    return_ = Math.tanh(return_ * 2.4) / 2.4; // 2.4 = 1/0.15 (15% 제한에 맞춤)

    return return_;
  }

  // GARCH(1,1) 기반 일별 수익률 생성 (새로 추가)
  generateGARCHDailyReturn(mean, volatility, rng, garchParams = null) {
    // GARCH(1,1) 파라미터 (ETF별 추정 또는 기본값)
    const ALPHA = garchParams?.alpha || 0.12;
    const BETA = garchParams?.beta || 0.86;
    const OMEGA = garchParams?.omega || 1e-6;

    // 초기 변동성 설정
    let sigma = volatility / Math.sqrt(252); // 일별 변동성

    // GARCH 안정성 검증
    if (ALPHA + BETA >= 1) {
      console.warn("GARCH 안정성 조건 위반: α + β >= 1");
    }

    // GARCH(1,1) 모델: 동적 변동성 사용
    const rngNormalValue = this.generateNormalRandom(0, 1);
    const shock = rngNormalValue * sigma; // εₜ

    // 극단값 완전 제거 대신 점진적 완화 → 테일리스크 보존
    // tanh 로 부드럽게 제한: ±15% 이상은 점차 포화
    const softCapped = Math.tanh(shock * 6.67) / 6.67; // 6.67 = 1/0.15 (15% 제한에 맞춤)
    const dailyReturn = mean / 252 + softCapped; // 일별 수익률

    // GARCH 업데이트: σ²ₜ₊₁ = ω + αε²ₜ + βσ²ₜ (softCapped 사용)
    sigma = Math.sqrt(OMEGA + ALPHA * softCapped ** 2 + BETA * sigma ** 2);

    return { return: dailyReturn, sigma };
  }

  // 정규분포 난수 생성
  generateNormalRandom(mean, volatility, random = null) {
    // 시드 기반 난수 생성기 또는 기본 Math.random 사용
    const rng = random || Math.random;

    // Box-Muller 변환
    const u1 = rng();
    const u2 = rng();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + volatility * z0;
  }

  // 극단적 이벤트 생성 (수정)
  generateExtremeEvent(skewness) {
    // 꼬리 위험을 반영한 극단적 수익률 - 덧셈용으로 변경
    const extremeFactor = skewness > 0 ? 0.05 : -0.05; // 5% → 0.05
    return extremeFactor;
  }

  // 변동성 클러스터링 적용 (사용하지 않음)
  applyVolatilityClustering(random = null) {
    // 시드 기반 난수 생성기 또는 기본 Math.random 사용
    const rng = random || Math.random;

    // 간단한 변동성 클러스터링 시뮬레이션
    return 1 + (rng() - 0.5) * 0.1; // ±5% 변동성
  }

  // 일별 DCA 시뮬레이션
  dcaSimDaily(dailyRets, initialAmount, monthlyContribution) {
    let portfolioValue = initialAmount;
    const monthlyContributionDaily = monthlyContribution / 21; // 월 21거래일 가정

    dailyRets.forEach((dailyReturn, dayIndex) => {
      // 수익률 적용
      portfolioValue += monthlyContributionDaily;
      portfolioValue *= 1 + dailyReturn;

      // 일별 납입 (매일 소액 납입)
      portfolioValue = Math.max(0, portfolioValue);
    });

    return portfolioValue;
  }

  // 최대 낙폭 계산
  calculateMaxDrawdown(scenario) {
    let peak = 1;
    let maxDrawdown = 0;
    let currentValue = 1;

    scenario.forEach((return_) => {
      currentValue *= 1 + return_;
      if (currentValue > peak) {
        peak = currentValue;
      }
      const drawdown = (peak - currentValue) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    return maxDrawdown;
  }

  /**
   * 시나리오의 연간 변동성 계산
   * @param {Array<number>} scenario - 일별 수익률 배열
   * @returns {number} 연간 변동성
   *
   * 연간화 방법:
   * 1. 일별 수익률의 표준편차 계산
   * 2. 제곱근 스케일링: sqrt(variance * 252)
   *
   * 수학적 근거: 분산의 가법성으로 인한 제곱근 스케일링
   */
  calculateVolatility(scenario) {
    const mean = scenario.reduce((sum, ret) => sum + ret, 0) / scenario.length;
    const variance =
      scenario.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
      scenario.length;
    return Math.sqrt(variance * 252); // 연간 변동성으로 변환
  }

  /**
   * 샤프 비율 계산
   * @param {Array<number>} scenario - 일별 수익률 배열
   * @param {number} riskFreeRate - 무위험 수익률
   * @returns {number} 샤프 비율
   *
   * 계산 방법:
   * 1. 연간 초과수익률: mean * 252 - riskFreeRate
   * 2. 연간 변동성: calculateVolatility(scenario)
   * 3. 샤프 비율: excessReturn / volatility
   *
   * 수학적 근거: 위험 조정 수익률 측정 지표
   */
  calculateSharpeRatio(scenario, riskFreeRate) {
    const mean = scenario.reduce((sum, ret) => sum + ret, 0) / scenario.length;
    const volatility = this.calculateVolatility(scenario);
    const excessReturn = mean * 252 - riskFreeRate; // 연간 초과수익률
    return volatility > 0 ? excessReturn / volatility : 0;
  }

  // 종합 분석
  comprehensiveAnalysis(
    simulationResults,
    targetAmount,
    initialInvestment,
    targetYears,
    monthlyContribution
  ) {
    const finalValues = simulationResults.map((result) => result.finalValue);

    // 디버깅 정보 추가
    console.log("🔍 분석 정보:", {
      targetAmount,
      finalValuesCount: finalValues.length,
      minValue: Math.min(...finalValues),
      maxValue: Math.max(...finalValues),
      avgValue:
        finalValues.reduce((sum, val) => sum + val, 0) / finalValues.length,
      successCount: finalValues.filter((value) => value >= targetAmount).length,
    });

    const sortedValues = finalValues.sort((a, b) => a - b);

    const successCount = finalValues.filter(
      (value) => value >= targetAmount
    ).length;
    const successRate = (successCount / finalValues.length) * 100;

    const expectedValue =
      finalValues.reduce((sum, val) => sum + val, 0) / finalValues.length;

    // 변동성 계산 수정: 연간화된 수익률 기준으로 계산
    const annualizedReturns = finalValues.map((finalValue) => {
      const totalReturn = (finalValue - initialInvestment) / initialInvestment;
      return Math.pow(1 + totalReturn, 1 / targetYears) - 1; // 연간화
    });
    const volatility = this.calculateVolatilityFromValues(annualizedReturns);

    const maxDrawdown = Math.max(
      ...simulationResults.map((result) => result.maxDrawdown)
    );
    const sharpeRatioValue = sharpeRatio(
      mean(annualizedReturns),
      volatility,
      0.02 // 무위험 수익률 2%
    );

    // 리스크 조정 수익률 계산 수정: 샤프비율 * 성공률 (퍼센트 단위)
    const riskAdjustedReturn = sharpeRatioValue * (successRate / 100);

    // VaR (Value at Risk) - 95% 신뢰구간
    const var95 = sortedValues[Math.floor(sortedValues.length * 0.05)];

    // CVaR (Conditional VaR) - 최악의 5% 시나리오 평균
    const worst5Percent = sortedValues.slice(
      0,
      Math.floor(sortedValues.length * 0.05)
    );
    const cvar95 =
      worst5Percent.reduce((sum, val) => sum + val, 0) / worst5Percent.length;

    // VaR/CVaR을 손실 지표로 수정 (포트폴리오 가치 → 손실액)
    const totalContribution =
      initialInvestment + monthlyContribution * targetYears * 12;
    const var95Loss = totalContribution - var95; // 투입 원금 대비 손실 (올바른 방향)
    const cvar95Loss = totalContribution - cvar95; // 투입 원금 대비 손실 (올바른 방향)

    // 신뢰구간
    const confidenceIntervals = {
      percentile5: sortedValues[Math.floor(sortedValues.length * 0.05)],
      percentile25: sortedValues[Math.floor(sortedValues.length * 0.25)],
      median: sortedValues[Math.floor(sortedValues.length * 0.5)],
      percentile75: sortedValues[Math.floor(sortedValues.length * 0.75)],
      percentile95: sortedValues[Math.floor(sortedValues.length * 0.95)],
    };

    return {
      successRate,
      expectedValue,
      volatility,
      maxDrawdown,
      sharpeRatio: sharpeRatioValue,
      var95: var95Loss,
      cvar95: cvar95Loss,
      confidenceIntervals,
      riskAdjustedReturn,
    };
  }

  // 값들의 변동성 계산
  calculateVolatilityFromValues(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    return Math.sqrt(variance);
  }

  // 왜도 계산
  calculateSkewness(returns, mean, volatility) {
    const n = returns.length;
    const skewness =
      returns.reduce(
        (sum, ret) => sum + Math.pow((ret - mean) / volatility, 3),
        0
      ) / n;
    return skewness;
  }

  // 첨도 계산
  calculateKurtosis(returns, mean, volatility) {
    const n = returns.length;
    const kurtosis =
      returns.reduce(
        (sum, ret) => sum + Math.pow((ret - mean) / volatility, 4),
        0
      ) / n;
    return kurtosis;
  }

  // 일별 로그수익률 계산
  toDailyLogReturns(prices) {
    const dailyReturns = [];

    for (let i = 1; i < prices.length; i++) {
      const prevPrice = prices[i - 1].price;
      const currPrice = prices[i].price;
      const logReturn = Math.log(currPrice / prevPrice);
      dailyReturns.push(logReturn);
    }

    return dailyReturns;
  }

  /**
   * 목표 달성을 위해 필요한 연간 수익률(CAGR) 계산
   * @param {number} targetAmount - 목표 금액
   * @param {number} initialAmount - 초기 투자금
   * @param {number} monthlyContribution - 월 투자금
   * @param {number} years - 투자 기간
   * @returns {number} 필요한 연간 수익률 (%)
   *
   * 계산 방법:
   * 1. 총 투자금 계산: initialAmount + monthlyContribution * totalMonths
   * 2. CAGR 계산: (targetAmount / totalContribution)^(1/years) - 1
   *
   * 수학적 근거: 복리 효과를 고려한 기하평균 방식
   */
  requiredCagr(targetAmount, initialAmount, monthlyContribution, years) {
    const totalMonths = years * 12;
    const totalContribution = initialAmount + monthlyContribution * totalMonths;

    // 목표 금액이 총 투자금보다 작거나 같은 경우
    if (totalContribution >= targetAmount) {
      // 목표 금액이 총 투자금보다 작은 경우 음수 수익률 반환
      if (totalContribution > targetAmount) {
        const requiredReturn = targetAmount / totalContribution;
        const cagr = Math.pow(requiredReturn, 1 / years) - 1;
        return parseFloat((cagr * 100).toFixed(1));
      }
      // 목표 금액이 총 투자금과 같은 경우 0% 반환
      return 0;
    }

    // 목표 금액이 총 투자금보다 큰 경우 양수 수익률 계산
    const requiredReturn = targetAmount / totalContribution;
    const cagr = Math.pow(requiredReturn, 1 / years) - 1;

    return parseFloat((cagr * 100).toFixed(1));
  }

  /**
   * ETF별 GARCH(1,1) 파라미터 추정
   * @param {Array} prices - 가격 데이터 배열
   * @returns {object} { alpha, beta, omega } GARCH 파라미터
   *
   * 추정 방법:
   * 1. 일별 수익률 계산
   * 2. 변동성 클러스터링 분석
   * 3. 자산군별 기본값 적용
   *
   * 수학적 근거: 변동성 지속성과 충격 반응성의 자산별 특성
   */
  estimateGARCHParameters(prices) {
    if (!prices || prices.length < 60) {
      // 데이터 부족 시 기본값 반환
      return { alpha: 0.12, beta: 0.86, omega: 1e-6 };
    }

    // 일별 수익률 계산
    const returns = this.toDailyLogReturns(prices);

    if (returns.length < 30) {
      return { alpha: 0.12, beta: 0.86, omega: 1e-6 };
    }

    // 변동성 클러스터링 분석
    const volatility = this.calculateVolatility(returns);
    const meanReturn =
      returns.reduce((sum, ret) => sum + ret, 0) / returns.length;

    // 변동성의 변동성 (변동성 클러스터링 강도)
    const volatilityOfVolatility =
      this.calculateVolatilityOfVolatility(returns);

    // 자산군별 기본 파라미터 (ETF 코드 기반 추정)
    const assetClass = this.estimateAssetClass(prices, volatility);
    const baseParams = this.getBaseGARCHParams(assetClass);

    // 변동성 클러스터링 강도에 따른 조정
    const clusteringFactor = Math.min(
      1.0,
      Math.max(0.1, volatilityOfVolatility / 0.1)
    );

    // 파라미터 조정
    const alpha = Math.min(
      0.3,
      Math.max(0.05, baseParams.alpha * clusteringFactor)
    );
    const beta = Math.min(
      0.95,
      Math.max(0.7, baseParams.beta * (1 + clusteringFactor * 0.1))
    );
    const omega = baseParams.omega * (1 + clusteringFactor);

    // GARCH 안정성 조건 확인
    if (alpha + beta >= 1) {
      const adjustment = 0.99 / (alpha + beta);
      return {
        alpha: alpha * adjustment,
        beta: beta * adjustment,
        omega: omega,
      };
    }

    return { alpha, beta, omega };
  }

  /**
   * 변동성의 변동성 계산
   * @param {Array} returns - 수익률 배열
   * @returns {number} 변동성의 변동성
   */
  calculateVolatilityOfVolatility(returns) {
    if (returns.length < 20) return 0.1;

    // 20일 이동 윈도우로 변동성 계산
    const windowSize = 20;
    const volatilities = [];

    for (let i = windowSize; i < returns.length; i++) {
      const windowReturns = returns.slice(i - windowSize, i);
      const mean =
        windowReturns.reduce((sum, ret) => sum + ret, 0) / windowSize;
      const variance =
        windowReturns.reduce((sum, ret) => sum + (ret - mean) ** 2, 0) /
        windowSize;
      volatilities.push(Math.sqrt(variance));
    }

    if (volatilities.length < 2) return 0.1;

    // 변동성의 표준편차
    const volMean =
      volatilities.reduce((sum, vol) => sum + vol, 0) / volatilities.length;
    const volVariance =
      volatilities.reduce((sum, vol) => sum + (vol - volMean) ** 2, 0) /
      volatilities.length;

    return Math.sqrt(volVariance);
  }

  /**
   * 자산군 추정
   * @param {Array} prices - 가격 데이터
   * @param {number} volatility - 변동성
   * @returns {string} 자산군 ('equity', 'bond', 'commodity', 'mixed')
   */
  estimateAssetClass(prices, volatility) {
    // 변동성 기반 자산군 추정
    if (volatility < 0.1) return "bond"; // 저변동성 → 채권
    if (volatility > 0.3) return "commodity"; // 고변동성 → 원자재
    if (volatility > 0.2) return "equity"; // 중고변동성 → 주식
    return "mixed"; // 중간변동성 → 혼합
  }

  /**
   * 자산군별 기본 GARCH 파라미터
   * @param {string} assetClass - 자산군
   * @returns {object} { alpha, beta, omega }
   */
  getBaseGARCHParams(assetClass) {
    const params = {
      equity: { alpha: 0.12, beta: 0.86, omega: 1e-6 }, // 주식: 중간 지속성
      bond: { alpha: 0.08, beta: 0.9, omega: 1e-7 }, // 채권: 높은 지속성
      commodity: { alpha: 0.18, beta: 0.8, omega: 1e-5 }, // 원자재: 낮은 지속성
      mixed: { alpha: 0.12, beta: 0.86, omega: 1e-6 }, // 혼합: 기본값
    };

    return params[assetClass] || params.mixed;
  }

  /**
   * 시드 생성 (충돌 최소화)
   * @param {string} etfCode - ETF 코드
   * @param {number} userId - 사용자 ID
   * @returns {number} 고유한 시드값
   *
   * 개선 방법:
   * 1. utils/hash.js의 generateEtfUserSeed 사용
   * 2. 32-bit unsigned integer 보장
   * 3. 추가 분산을 위한 비트 시프트 적용
   *
   * 수학적 근거: 해시 함수의 균등 분포 특성 활용
   */
  generateSeed(etfCode, userId) {
    return generateEtfUserSeed(etfCode, userId);
  }
}

module.exports = { MonteCarloEngine };
