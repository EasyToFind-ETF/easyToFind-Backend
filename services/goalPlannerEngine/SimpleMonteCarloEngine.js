// services/goalPlannerEngine/SimpleMonteCarloEngine.js
const { GoalSimEngine } = require("./GoalSimEngine");
const { getPersonalScoreMap } = require("../../dao/riskMetricsDao");
const { getEtfRecommendationScoreDao } = require("../../dao/etfDetailDao");
const { createSeededRng, tStudent, rngNormal } = require("../../utils/random");
const { generateEtfUserSeed } = require("../../utils/hash");
const {
  mean,
  std,
  stdDev,
  percentile,
  sharpeRatio,
  varCvar,
  maxDrawdown,
  calculateReturns,
  annualizeStats,
  wilsonCI,
} = require("../../utils/stats");
const { getConfig } = require("../../config/monteCarlo");

class SimpleMonteCarloEngine extends GoalSimEngine {
  async simulate(input, etfData, connection) {
    const startTime = Date.now(); // 시작 시간 측정

    const {
      targetAmount,
      targetYears,
      initialAmount,
      monthlyContribution,
      riskProfile,
      userId = 0,
    } = input;

    // 환경별 설정 로드
    const config = getConfig(process.env.NODE_ENV || "production");
    const simulations = config.simulations;

    // Sharpe 비율 정규화를 위한 배열 준비
    const allSharpes = [];

    console.log("🚀 Enhanced Simple Monte Carlo 시작:", {
      etfCount: etfData.length,
      simulations,
      targetAmount,
      targetYears,
      initialAmount,
      monthlyContribution,
    });

    // 개인화 점수 맵 로드
    const personalMap = await getPersonalScoreMap(connection, riskProfile);

    // ETF별 시뮬레이션 수행 (상위 50개)
    const results = await Promise.all(
      etfData.slice(0, 50).map(async (etf) => {
        const result = await this.simulateEtf(
          etf,
          targetAmount,
          targetYears,
          initialAmount,
          monthlyContribution,
          personalMap,
          config,
          userId
        );

        // Sharpe 비율을 정규화 배열에 추가
        allSharpes.push(result.sharpe_ratio);

        return result;
      })
    );

    // Sharpe Z-score → 0~100 스케일 정규화
    if (allSharpes.length >= 5) {
      // 최소 5개 ETF 필요
      let mu = mean(allSharpes);
      let sigma = stdDev(allSharpes) || 1e-9; // 0 Division Guard

      // NaN/∞ 방어 로직 추가
      if (!isFinite(sigma) || sigma === 0) {
        console.warn("⚠️ Sharpe 정규화에서 σ≈0 또는 NaN 감지, 기본값 사용");
        sigma = 1e-6;
      }

      console.log("📊 Sharpe 정규화 통계:", {
        count: allSharpes.length,
        mean: mu.toFixed(4),
        stdDev: sigma.toFixed(4),
        min: Math.min(...allSharpes).toFixed(4),
        max: Math.max(...allSharpes).toFixed(4),
      });

      // 각 ETF에 정규화된 리스크 점수 추가
      results.forEach((r) => {
        const z = (r.sharpe_ratio - mu) / sigma; // Z-score
        const norm = Math.max(0, Math.min(1, (z + 3) / 6)); // 0~1 매핑
        r.riskAdjustedScore = parseFloat((norm * 100).toFixed(1)); // 0~100, 소수점 첫째자리

        // 최종 NaN 방어
        if (isNaN(r.riskAdjustedScore)) {
          r.riskAdjustedScore = 0;
        }

        // 정규화된 리스크 점수로 goal_score 재계산
        r.goal_score = this.calculateGoalScore(
          r.success_rate,
          r.personal_score,
          r.riskAdjustedScore
        );

        console.log(`📈 ${r.etf_code} Sharpe 정규화:`, {
          original: r.sharpe_ratio.toFixed(4),
          zScore: z.toFixed(4),
          normalized: r.riskAdjustedScore.toFixed(2),
          newGoalScore: r.goal_score.toFixed(2),
        });
      });
    } else {
      console.warn(
        "⚠️ ETF 수가 적어 Sharpe 정규화를 건너뜁니다:",
        allSharpes.length
      );
      // 기본값 설정
      results.forEach((r) => {
        r.riskAdjustedScore = parseFloat(
          Math.min(100, r.sharpe_ratio * 20).toFixed(1)
        ); // 기존 방식, 소수점 첫째자리

        // NaN 방어
        if (isNaN(r.riskAdjustedScore)) {
          r.riskAdjustedScore = 0;
        }

        // 기본값으로도 goal_score 재계산
        r.goal_score = this.calculateGoalScore(
          r.success_rate,
          r.personal_score,
          r.riskAdjustedScore
        );
      });
    }

    // 정규화 후 결과 재정렬
    const finalSortedResults = results.sort(
      (a, b) => b.goal_score - a.goal_score
    );
    const topResults = finalSortedResults.slice(0, 10);

    const endTime = Date.now(); // 종료 시간 측정
    const calculationTime = ((endTime - startTime) / 1000).toFixed(1); // 초 단위

    return {
      recommendations: topResults,
      meta: {
        simulationMethod: "Enhanced Simple Monte Carlo",
        simulationCount: simulations,
        targetDays: targetYears * 252,
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
        enhancements: {
          marketRegimeAnalysis: true,
          dynamicVolatility: true,
          enhancedRandomFactors: true,
          riskAdjustedScoring: true,
          dataQualityAssessment: true,
        },
      },
    };
  }

  // 벤치마크 메서드 추가
  async benchmark(etfCount = 50, pathPerETF = 2000) {
    console.log(`🏁 벤치마크 시작: ${etfCount}개 ETF × ${pathPerETF} 경로`);

    const startTime = Date.now();

    // 더미 ETF 데이터 생성
    const dummyEtfData = Array.from({ length: etfCount }, (_, i) => ({
      etf_code: `BENCH${i.toString().padStart(3, "0")}`,
      etf_name: `Benchmark ETF ${i}`,
      asset_class: "equity",
      theme: "benchmark",
      prices: this.generateDummyPrices(5), // 5년 데이터
    }));

    // 테스트 입력 데이터
    const testInput = {
      targetAmount: 1000000,
      targetYears: 5,
      initialAmount: 100000,
      monthlyContribution: 10000,
      riskProfile: "moderate",
      userId: 999,
    };

    // Mock connection with query method
    const mockConnection = {
      query: async () => ({ rows: [] }), // 빈 결과 반환
    };

    // 시뮬레이션 실행
    const result = await this.simulate(testInput, dummyEtfData, mockConnection);

    const endTime = Date.now();
    const durationMs = endTime - startTime;

    // 결과 출력
    console.table({
      etfCount,
      pathPerETF,
      durationMs,
      avgTimePerETF: Math.round(durationMs / etfCount),
      avgTimePerPath: Math.round(durationMs / (etfCount * pathPerETF)),
      recommendationsCount: result.recommendations.length,
      simulationMethod: result.meta.simulationMethod,
    });

    return {
      durationMs,
      result,
      benchmark: {
        etfCount,
        pathPerETF,
        totalPaths: etfCount * pathPerETF,
        avgTimePerETF: Math.round(durationMs / etfCount),
        avgTimePerPath: Math.round(durationMs / (etfCount * pathPerETF)),
      },
    };
  }

  // 더미 가격 데이터 생성 헬퍼
  generateDummyPrices(years) {
    const days = years * 252;
    const dailyReturn = 0.0003; // 연 7.5% 수익률
    const dailyVolatility = 0.015; // 연 24% 변동성
    const prices = [100];

    // 벤치마크용 시드 생성
    const seed = this.generateSeed("BENCH", 999);
    const rng = createSeededRng(seed);

    for (let i = 1; i < days; i++) {
      const randomReturn = dailyReturn + (rng() - 0.5) * dailyVolatility;
      const newPrice = prices[i - 1] * (1 + randomReturn);
      prices.push(Math.max(0.1, newPrice));
    }

    return prices;
  }

  // ETF별 시뮬레이션 수행 (10줄 이하 함수)
  async simulateEtf(
    etf,
    targetAmount,
    targetYears,
    initialAmount,
    monthlyContribution,
    personalMap,
    config,
    userId
  ) {
    const personalScore = personalMap[etf.etf_code] ?? 50;

    // 데이터베이스에서 실제 변동성과 최대낙폭 값 가져오기
    const recommendationData = await getEtfRecommendationScoreDao(etf.etf_code);

    // 데이터베이스 조회 결과 디버깅
    console.log(`🔍 ${etf.etf_code} DB 조회 결과:`, {
      hasData: !!recommendationData,
      rawData: recommendationData,
      volatility: recommendationData?.volatility,
      mdd: recommendationData?.mdd,
      baseDate: recommendationData?.base_date,
    });

    const dbVolatility = recommendationData?.volatility || 0.15; // 기본값 15%
    const dbMaxDrawdown = recommendationData?.mdd || 0.3; // 기본값 30%

    const { baseReturn, volatility, marketRegime } = this.calculateEtfMetrics(
      etf,
      personalScore
    );

    // 데이터베이스 값 우선 사용
    const finalVolatility = dbVolatility;
    const finalMaxDrawdown = dbMaxDrawdown;

    const seed = this.generateSeed(etf.etf_code, userId);
    const rng = createSeededRng(seed);

    console.log(`🔍 ${etf.etf_code} 시뮬레이션 시작:`, {
      baseReturn: baseReturn.toFixed(4),
      volatility: volatility.toFixed(4),
      dbVolatility: (dbVolatility * 100).toFixed(2) + "%",
      dbMaxDrawdown: (dbMaxDrawdown * 100).toFixed(2) + "%",
      volatilityMonth: (finalVolatility / Math.sqrt(12)).toFixed(4),
      ratio: Math.sqrt(12).toFixed(2),
      marketRegime,
      targetAmount,
      initialAmount,
      monthlyContribution,
    });

    // 시뮬레이션 실행
    const simulationResults = Array.from({ length: config.simulations }, () =>
      this.runSingleSimulation(
        baseReturn,
        finalVolatility, // 데이터베이스 변동성 사용
        targetYears,
        initialAmount,
        monthlyContribution,
        rng,
        config,
        this.estimateGARCHParameters(etf.prices) // ETF별 GARCH 파라미터 전달
      )
    );

    // 통계 계산
    const finalValues = simulationResults.map((r) => r.finalValue);
    const monthlyPaths = simulationResults.map((r) => r.monthlyValues);
    const analysis = this.calculateStatistics(
      finalValues,
      monthlyPaths,
      targetAmount,
      config,
      initialAmount, // initialInvestment
      targetYears, // targetYears
      monthlyContribution, // monthlyContribution
      finalMaxDrawdown // 데이터베이스 최대낙폭 사용
    );

    // 개별 ETF 성공률 신뢰구간 계산 (Wilson CI 방식)
    const successCount = Math.round(
      (analysis.successRate * config.simulations) / 100
    );
    const { low, mid, high } = wilsonCI(successCount, config.simulations);

    console.log(`📊 ${etf.etf_code} 분석 결과:`, {
      successRate: analysis.successRate.toFixed(2) + "%",
      confidenceInterval: `${low.toFixed(1)}% - ${high.toFixed(1)}%`,
      expectedValue: Math.round(analysis.expectedValue).toLocaleString(),
      volatility: (analysis.volatility * 100).toFixed(2) + "%",
      dbVolatilityUsed: (dbVolatility * 100).toFixed(2) + "%",
      maxDrawdown: (analysis.maxDrawdown * 100).toFixed(2) + "%",
      dbMaxDrawdownUsed: (dbMaxDrawdown * 100).toFixed(2) + "%",
      finalValuesCount: finalValues.length,
      minValue: Math.min(...finalValues).toLocaleString(),
      maxValue: Math.max(...finalValues).toLocaleString(),
    });

    return {
      etf_code: etf.etf_code,
      etf_name: etf.etf_name,
      asset_class: etf.asset_class,
      theme: etf.theme,
      success_rate: parseFloat(analysis.successRate.toFixed(1)),
      expected_value: Math.round(analysis.expectedValue), // 원단위는 정수로
      volatility: parseFloat((analysis.volatility * 100).toFixed(1)), // 퍼센트, 소수점 첫째자리
      max_drawdown: parseFloat(analysis.maxDrawdown.toFixed(1)), // 퍼센트, 소수점 첫째자리
      sharpe_ratio: parseFloat(analysis.sharpeRatio.toFixed(1)), // 소수점 첫째자리
      var_95: Math.round(analysis.var95), // 원단위는 정수로
      cvar_95: Math.round(analysis.cvar95), // 원단위는 정수로
      personal_score: personalScore,
      goal_score: this.calculateGoalScore(
        analysis.successRate,
        personalScore,
        analysis.riskAdjustedReturn // 임시로 기존 값 사용 (정규화 후 업데이트됨)
      ),
      risk_adjusted_return: parseFloat(
        analysis.riskAdjustedReturn.toFixed(1) // * 100 제거 (이미 퍼센트 단위)
      ), // 퍼센트, 소수점 첫째자리
      market_regime: marketRegime,
      simulation_count: config.simulations,
      monthly_paths: monthlyPaths.slice(0, 5),
      confidence_interval: {
        low: parseFloat(low.toFixed(1)),
        mid: parseFloat(mid.toFixed(1)),
        high: parseFloat(high.toFixed(1)),
      },
    };
  }

  // ETF 메트릭 계산 (10줄 이하 함수)
  calculateEtfMetrics(etf, personalScore) {
    const historicalReturn = this.calculateHistoricalReturn(etf.prices);
    const historicalVolatility = this.calculateHistoricalVolatility(etf.prices);
    const marketRegime = this.analyzeMarketRegime(etf.prices);
    const personalBasedReturn = this.calculatePersonalBasedReturn(
      personalScore,
      marketRegime
    );
    const dataQuality = this.assessDataQuality(etf.prices);

    const historicalWeight = Math.min(0.8, Math.max(0.3, dataQuality));
    const baseReturn =
      historicalReturn * historicalWeight +
      personalBasedReturn * (1 - historicalWeight);
    const volatility = this.calculateEnhancedVolatility(
      historicalVolatility,
      marketRegime,
      personalScore
    );

    // config를 getConfig로 가져오기
    const config = getConfig(process.env.NODE_ENV || "production");

    return {
      baseReturn: this.applySafetyChecks(baseReturn, marketRegime, config),
      volatility: this.applyVolatilityChecks(volatility, marketRegime, config),
      marketRegime,
    };
  }

  // 단일 시뮬레이션 실행 (10줄 이하 함수)
  runSingleSimulation(
    baseReturn,
    volatility,
    targetYears,
    initialAmount,
    monthlyContribution,
    rng,
    config,
    garchParams = null
  ) {
    const monthlyReturn = Math.pow(1 + baseReturn, 1 / 12) - 1;
    // 변동성 올바른 환산: 연간 → 월간 변환
    const histMonthlyStd = volatility / Math.sqrt(12); // 연간 → 월간 변환 (√12 사용)

    // GARCH(1,1) 파라미터 (ETF별 추정 또는 기본값)
    const ALPHA = garchParams?.alpha || config.garch?.alpha || 0.12;
    const BETA = garchParams?.beta || config.garch?.beta || 0.86;
    const OMEGA = garchParams?.omega || config.garch?.omega || 1e-6;

    // 초기 변동성 설정
    let sigma = histMonthlyStd;

    // GARCH 안정성 검증
    if (config.garch?.stabilityCheck && ALPHA + BETA >= 1) {
      console.warn("GARCH 안정성 조건 위반: α + β >= 1");
    }

    const portfolio = Array.from({ length: targetYears * 12 }, (_, month) => {
      // GARCH(1,1) 모델: 동적 변동성 사용
      const rngNormalValue = rngNormal(rng);
      const shock = rngNormalValue * sigma; // εₜ

      // 극단값 완전 제거 대신 점진적 완화 → 테일리스크 보존
      // tanh 로 부드럽게 제한: ±15% 이상은 점차 포화 (완화)
      const softCapped = Math.tanh(shock * 2.4) / 2.4; // 2.4 = 1/0.15 (15% 제한에 맞춤)
      const monthlyReturnWithShock = monthlyReturn + softCapped;

      // GARCH 업데이트: σ²ₜ₊₁ = ω + αε²ₜ + βσ²ₜ (softCapped 사용)
      sigma = Math.sqrt(OMEGA + ALPHA * softCapped ** 2 + BETA * sigma ** 2);

      // 3년 시뮬레이션에서 sigma 변동 확인 (디버깅용)
      if (targetYears === 3 && month % 12 === 0) {
        console.log(`GARCH σ 변동 (${month / 12}년차):`, sigma.toFixed(6));
      }

      return { month, return: monthlyReturnWithShock, sigma };
    }).reduce(
      (portfolio, { return: monthlyReturn }) => {
        portfolio.value *= 1 + monthlyReturn;
        portfolio.value += monthlyContribution;
        portfolio.monthlyValues.push(portfolio.value);
        portfolio.peakValue = Math.max(portfolio.peakValue, portfolio.value);
        portfolio.maxDrawdown = Math.max(
          portfolio.maxDrawdown,
          (portfolio.peakValue - portfolio.value) / portfolio.peakValue
        );
        return portfolio;
      },
      {
        value: initialAmount,
        monthlyValues: [initialAmount],
        peakValue: initialAmount,
        maxDrawdown: 0,
      }
    );

    // finalValue를 포함한 객체 반환
    return {
      finalValue: portfolio.value,
      monthlyValues: portfolio.monthlyValues,
      maxDrawdown: portfolio.maxDrawdown,
    };
  }

  // 통계 계산 (10줄 이하 함수)
  calculateStatistics(
    finalValues,
    monthlyPaths,
    targetAmount,
    config,
    initialInvestment,
    targetYears,
    monthlyContribution,
    finalMaxDrawdown
  ) {
    const successRate =
      (finalValues.filter((v) => v >= targetAmount).length /
        finalValues.length) *
      100;
    const expectedValue = mean(finalValues);

    // 변동성 계산 수정: 연간화된 수익률 기준으로 계산
    const annualizedReturns = finalValues.map((finalValue) => {
      const totalReturn = (finalValue - initialInvestment) / initialInvestment;
      return Math.pow(1 + totalReturn, 1 / targetYears) - 1; // 연간화
    });
    const volatility = std(annualizedReturns); // 이미 연간화된 수익률의 표준편차

    // 변동성 디버깅 로그 추가
    console.log("🔍 변동성 계산 디버깅:", {
      initialInvestment,
      targetYears,
      sampleReturns: annualizedReturns
        .slice(0, 5)
        .map((r) => (r * 100).toFixed(2) + "%"),
      volatility: (volatility * 100).toFixed(2) + "%",
      volatilityRaw: volatility,
    });

    const { var: var95, cvar: cvar95 } = varCvar(
      finalValues,
      config.riskMetrics.varConfidence
    );

    // VaR/CVaR을 손실 지표로 수정 (포트폴리오 가치 → 손실액)
    const totalContribution =
      initialInvestment + monthlyContribution * targetYears * 12;
    const var95Loss = totalContribution - var95; // 투입 원금 대비 손실 (올바른 방향)
    const cvar95Loss = totalContribution - cvar95; // 투입 원금 대비 손실 (올바른 방향)

    // VaR/CVaR 디버깅 로그 추가
    console.log("🔍 VaR/CVaR 계산 디버깅:", {
      initialInvestment,
      monthlyContribution,
      targetYears,
      totalContribution,
      var95Original: var95,
      cvar95Original: cvar95,
      var95Loss,
      cvar95Loss,
      var95Percent: ((var95Loss / totalContribution) * 100).toFixed(2) + "%",
      cvar95Percent: ((cvar95Loss / totalContribution) * 100).toFixed(2) + "%",
    });

    // 샤프비율 계산 수정: 연간화된 수익률과 변동성 사용
    const avgAnnualizedReturn = mean(annualizedReturns);
    const sharpeRatioValue = sharpeRatio(
      avgAnnualizedReturn,
      volatility,
      config.riskFreeRate
    );

    // Sharpe 계산 디버깅 로그 추가
    console.log("🔍 Sharpe 계산 디버깅:", {
      avgAnnualizedReturn: (avgAnnualizedReturn * 100).toFixed(2) + "%",
      volatility: (volatility * 100).toFixed(2) + "%",
      riskFreeRate: (config.riskFreeRate * 100).toFixed(2) + "%",
      sharpeRatio: sharpeRatioValue.toFixed(2),
      excessReturn:
        ((avgAnnualizedReturn - config.riskFreeRate) * 100).toFixed(2) + "%",
    });

    // 최대낙폭 계산 수정: 데이터베이스 값 우선 사용
    let avgMaxDrawdown;
    if (finalMaxDrawdown && finalMaxDrawdown > 0) {
      // 데이터베이스 값 사용
      avgMaxDrawdown = finalMaxDrawdown;
      console.log(
        "🔍 최대낙폭: 데이터베이스 값 사용",
        avgMaxDrawdown.toFixed(2) + "%"
      );
    } else {
      // 계산된 값 사용 (기존 로직)
      const maxDrawdowns = monthlyPaths.map((path) => {
        let peak = Math.max(path[0], 1e-6); // 초기값 안전하게 설정
        let maxDrawdown = 0;

        for (let i = 1; i < path.length; i++) {
          peak = Math.max(peak, path[i]); // 더 간단하고 안전한 peak 업데이트
          // 분모 0 가드 추가
          const drawdown = peak > 1e-6 ? (peak - path[i]) / peak : 0;
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
          }
        }
        return maxDrawdown;
      });
      avgMaxDrawdown = mean(maxDrawdowns);

      // 최대낙폭 디버깅 로그 추가
      console.log("🔍 최대낙폭 계산 디버깅:", {
        samplePaths: monthlyPaths.slice(0, 3).map((path) => ({
          initialValue: path[0],
          maxValue: Math.max(...path),
          minValue: Math.min(...path),
          pathLength: path.length,
        })),
        maxDrawdownsSample: maxDrawdowns
          .slice(0, 5)
          .map((dd) => (dd * 100).toFixed(2) + "%"),
        avgMaxDrawdown: avgMaxDrawdown.toFixed(2) + "%",
      });
    }

    // 리스크 조정 수익률 계산 수정: 샤프비율 * 성공률 (퍼센트 단위)
    const riskAdjustedReturn = sharpeRatioValue * (successRate / 100);

    return {
      successRate,
      expectedValue,
      volatility,
      var95: var95Loss, // 손실액으로 변경
      cvar95: cvar95Loss, // 손실액으로 변경
      sharpeRatio: sharpeRatioValue,
      maxDrawdown: avgMaxDrawdown,
      riskAdjustedReturn,
    };
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

  // 목표 점수 계산
  calculateGoalScore(successRate, personalScore, riskScore) {
    return parseFloat(
      (
        successRate * 0.5 + // 성공률 50%
        riskScore * 0.3 + // 정규화된 리스크 점수 30%
        personalScore * 0.2
      ) // 개인화 20%
        .toFixed(2)
    );
  }

  // === 기존 메서드들 (간소화) ===

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
   * 과거 데이터로부터 연간 수익률 계산
   * @param {Array} prices - 가격 데이터 배열
   * @returns {number} 연간 수익률 (CAGR)
   *
   * 연간화 방법:
   * 1. 전체 수익률 계산: (lastPrice - firstPrice) / firstPrice
   * 2. 기하평균으로 연간화: (1 + totalReturn)^(1/years) - 1
   *
   * 수학적 근거: 복리 효과를 고려한 기하평균 방식
   */
  calculateHistoricalReturn(prices) {
    if (!prices || prices.length < 2) return 0.07;

    // prices 배열의 각 요소가 {date, price, aum} 객체인 경우
    const firstPrice = prices[0].price;
    const lastPrice = prices[prices.length - 1].price;

    const years = prices.length / 252;
    if (years <= 0 || firstPrice <= 0 || lastPrice <= 0) return 0.07;

    const totalReturn = (lastPrice - firstPrice) / firstPrice;
    const annualReturn = Math.pow(1 + totalReturn, 1 / years) - 1;
    return Math.max(-0.5, Math.min(0.5, annualReturn));
  }

  /**
   * 과거 데이터로부터 연간 변동성 계산
   * @param {Array} prices - 가격 데이터 배열
   * @returns {number} 연간 변동성
   *
   * 연간화 방법:
   * 1. 일별 수익률의 표준편차 계산
   * 2. 제곱근 스케일링: std(returns) * sqrt(252)
   *
   * 수학적 근거: 분산의 가법성으로 인한 제곱근 스케일링
   */
  calculateHistoricalVolatility(prices) {
    if (prices.length < 2) return 0.15;
    const returns = calculateReturns(prices);
    const volatility = std(returns) * Math.sqrt(252);
    return Math.max(0.05, Math.min(0.5, volatility));
  }

  analyzeMarketRegime(prices) {
    if (!prices || prices.length < 60) return "neutral";
    const recentPrices = prices.slice(-60);
    const olderPrices = prices.slice(-120, -60);
    const recentReturn = this.calculatePeriodReturn(recentPrices);
    const olderReturn = this.calculatePeriodReturn(olderPrices);
    const recentVolatility = this.calculatePeriodVolatility(recentPrices);
    const olderVolatility = this.calculatePeriodVolatility(olderPrices);

    if (recentReturn > 0.1 && recentVolatility < olderVolatility * 0.8)
      return "bull";
    if (recentReturn < -0.1 && recentVolatility > olderVolatility * 1.2)
      return "bear";
    if (recentVolatility > olderVolatility * 1.5) return "volatile";
    return "neutral";
  }

  calculatePersonalBasedReturn(personalScore, marketRegime) {
    const baseReturn = 0.02 + (personalScore / 100) * 0.1;
    const regimeAdjustments = {
      bull: 1.2,
      bear: 0.8,
      volatile: 0.9,
      neutral: 1.0,
    };
    return baseReturn * regimeAdjustments[marketRegime];
  }

  assessDataQuality(prices) {
    if (!prices || prices.length < 30) return 0.3;
    const dataLength = prices.length;
    const completeness = Math.min(1.0, dataLength / 252);
    let gaps = 0;
    for (let i = 1; i < prices.length; i++) {
      if (prices[i].price <= 0 || prices[i - 1].price <= 0) gaps++;
    }
    const continuity = Math.max(0.1, 1 - gaps / prices.length);
    const volatility = this.calculateHistoricalVolatility(prices);
    const stability =
      volatility < 0.5 ? 1.0 : Math.max(0.3, 1 - (volatility - 0.5));
    return completeness * 0.4 + continuity * 0.4 + stability * 0.2;
  }

  calculateEnhancedVolatility(
    historicalVolatility,
    marketRegime,
    personalScore
  ) {
    const regimeMultipliers = {
      bull: 0.8,
      bear: 1.3,
      volatile: 1.5,
      neutral: 1.0,
    };
    const adjustedVolatility =
      historicalVolatility * regimeMultipliers[marketRegime];
    const riskAdjustment = 1 + ((personalScore - 50) / 100) * 0.5;
    return Math.max(0.05, Math.min(0.8, adjustedVolatility * riskAdjustment));
  }

  applySafetyChecks(baseAnnualReturn, marketRegime, config) {
    const minReturns = {
      bull: 0.05,
      bear: -0.02,
      volatile: 0.02,
      neutral: 0.03,
    };
    const minReturn = minReturns[marketRegime];
    const maxReturn = 0.25;
    return Math.max(minReturn, Math.min(maxReturn, baseAnnualReturn));
  }

  applyVolatilityChecks(volatility, marketRegime, config) {
    const regimeRanges = {
      bull: { min: 0.05, max: 0.4 },
      bear: { min: 0.1, max: 0.8 },
      volatile: { min: 0.15, max: 0.8 },
      neutral: { min: 0.05, max: 0.6 },
    };
    const range = regimeRanges[marketRegime];
    return Math.max(range.min, Math.min(range.max, volatility));
  }

  calculatePeriodReturn(prices) {
    if (prices.length < 2) return 0;
    const firstPrice = prices[0].price;
    const lastPrice = prices[prices.length - 1].price;
    return (lastPrice - firstPrice) / firstPrice;
  }

  calculatePeriodVolatility(prices) {
    if (prices.length < 2) return 0;
    const returns = calculateReturns(prices);
    return std(returns) * Math.sqrt(252);
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
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const prevPrice = prices[i - 1].price;
      const currPrice = prices[i].price;
      if (prevPrice > 0) {
        const logReturn = Math.log(currPrice / prevPrice);
        returns.push(logReturn);
      }
    }

    if (returns.length < 30) {
      return { alpha: 0.12, beta: 0.86, omega: 1e-6 };
    }

    // 변동성 클러스터링 분석
    const volatility = this.calculateHistoricalVolatility(prices);
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
}

module.exports = { SimpleMonteCarloEngine };
