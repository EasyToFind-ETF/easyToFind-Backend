// services/goalPlannerEngine/SimpleMonteCarloEngine.js
const { GoalSimEngine } = require('./GoalSimEngine');
const { getPersonalScoreMap } = require('../../dao/riskMetricsDao');
const { createSeededRng, tStudent } = require('../../utils/random');
const {
  mean,
  std,
  percentile,
  sharpeRatio,
  varCvar,
  maxDrawdown,
  calculateReturns,
  annualizeStats,
} = require('../../utils/stats');
const { getConfig } = require('../../config/monteCarlo');

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
    const config = getConfig(process.env.NODE_ENV || 'production');
    const simulations = config.simulations;

    console.log('🚀 Enhanced Simple Monte Carlo 시작:', {
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
    const results = etfData
      .slice(0, 50)
      .map((etf) =>
        this.simulateEtf(
          etf,
          targetAmount,
          targetYears,
          initialAmount,
          monthlyContribution,
          personalMap,
          config,
          userId
        )
      );

    // 결과 정렬 및 상위 10개 반환
    const sortedResults = results.sort((a, b) => b.goal_score - a.goal_score);
    const topResults = sortedResults.slice(0, 10);

    const endTime = Date.now(); // 종료 시간 측정
    const calculationTime = ((endTime - startTime) / 1000).toFixed(1); // 초 단위

    return {
      recommendations: topResults,
      meta: {
        simulationMethod: 'Enhanced Simple Monte Carlo',
        simulationCount: simulations,
        targetDays: targetYears * 252,
        targetAmount,
        targetYears,
        calculationTime: `${calculationTime}초`, // 계산 시간 추가
        confidenceLevel: '95%', // 신뢰수준 추가
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
      etf_code: `BENCH${i.toString().padStart(3, '0')}`,
      etf_name: `Benchmark ETF ${i}`,
      asset_class: 'equity',
      theme: 'benchmark',
      prices: this.generateDummyPrices(5), // 5년 데이터
    }));

    // 테스트 입력 데이터
    const testInput = {
      targetAmount: 1000000,
      targetYears: 5,
      initialAmount: 100000,
      monthlyContribution: 10000,
      riskProfile: 'moderate',
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

    for (let i = 1; i < days; i++) {
      const randomReturn = dailyReturn + (Math.random() - 0.5) * dailyVolatility;
      const newPrice = prices[i - 1] * (1 + randomReturn);
      prices.push(Math.max(0.1, newPrice));
    }

    return prices;
  }

  // ETF별 시뮬레이션 수행 (10줄 이하 함수)
  simulateEtf(
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
    const { baseReturn, volatility, marketRegime } = this.calculateEtfMetrics(etf, personalScore);
    const seed = this.generateSeed(etf.etf_code, userId);
    const rng = createSeededRng(seed);

    console.log(`🔍 ${etf.etf_code} 시뮬레이션 시작:`, {
      baseReturn: baseReturn.toFixed(4),
      volatility: volatility.toFixed(4),
      marketRegime,
      targetAmount,
      initialAmount,
      monthlyContribution,
    });

    // 시뮬레이션 실행
    const simulationResults = Array.from({ length: config.simulations }, () =>
      this.runSingleSimulation(
        baseReturn,
        volatility,
        targetYears,
        initialAmount,
        monthlyContribution,
        rng,
        config
      )
    );

    // 통계 계산
    const finalValues = simulationResults.map((r) => r.finalValue);
    const monthlyPaths = simulationResults.map((r) => r.monthlyValues);
    const analysis = this.calculateStatistics(finalValues, monthlyPaths, targetAmount, config);

    console.log(`📊 ${etf.etf_code} 분석 결과:`, {
      successRate: analysis.successRate.toFixed(2) + '%',
      expectedValue: Math.round(analysis.expectedValue).toLocaleString(),
      volatility: (analysis.volatility * 100).toFixed(2) + '%',
      finalValuesCount: finalValues.length,
      minValue: Math.min(...finalValues).toLocaleString(),
      maxValue: Math.max(...finalValues).toLocaleString(),
    });

    return {
      etf_code: etf.etf_code,
      etf_name: etf.etf_name,
      asset_class: etf.asset_class,
      theme: etf.theme,
      success_rate: analysis.successRate,
      expected_value: analysis.expectedValue,
      volatility: analysis.volatility,
      max_drawdown: analysis.maxDrawdown,
      sharpe_ratio: analysis.sharpeRatio,
      var_95: analysis.var95,
      cvar_95: analysis.cvar95,
      personal_score: personalScore,
      goal_score: this.calculateGoalScore(
        analysis.successRate,
        personalScore,
        analysis.riskAdjustedReturn
      ),
      risk_adjusted_return: analysis.riskAdjustedReturn,
      market_regime: marketRegime,
      simulation_count: config.simulations,
      monthly_paths: monthlyPaths.slice(0, 5),
    };
  }

  // ETF 메트릭 계산 (10줄 이하 함수)
  calculateEtfMetrics(etf, personalScore) {
    const historicalReturn = this.calculateHistoricalReturn(etf.prices);
    const historicalVolatility = this.calculateHistoricalVolatility(etf.prices);
    const marketRegime = this.analyzeMarketRegime(etf.prices);
    const personalBasedReturn = this.calculatePersonalBasedReturn(personalScore, marketRegime);
    const dataQuality = this.assessDataQuality(etf.prices);

    const historicalWeight = Math.min(0.8, Math.max(0.3, dataQuality));
    const baseReturn =
      historicalReturn * historicalWeight + personalBasedReturn * (1 - historicalWeight);
    const volatility = this.calculateEnhancedVolatility(
      historicalVolatility,
      marketRegime,
      personalScore
    );

    // config를 getConfig로 가져오기
    const config = getConfig(process.env.NODE_ENV || 'production');

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
    config
  ) {
    const monthlyReturn = Math.pow(1 + baseReturn, 1 / 12) - 1;
    const monthlyVolatility = volatility / Math.sqrt(12);

    const portfolio = Array.from({ length: targetYears * 12 }, (_, month) => {
      const tValue = tStudent(config.tailDf, rng);
      const randomReturn = monthlyReturn + monthlyVolatility * tValue;
      const clippedReturn = Math.max(
        -config.maxMonthlyMove,
        Math.min(config.maxMonthlyMove, randomReturn)
      );
      return { month, return: clippedReturn };
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
  calculateStatistics(finalValues, monthlyPaths, targetAmount, config) {
    const successRate =
      (finalValues.filter((v) => v >= targetAmount).length / finalValues.length) * 100;
    const expectedValue = mean(finalValues);
    const volatility = std(finalValues);
    const { var: var95, cvar: cvar95 } = varCvar(finalValues, config.riskMetrics.varConfidence);
    const sharpeRatioValue = sharpeRatio(expectedValue, volatility, config.riskFreeRate);
    const avgMaxDrawdown = mean(monthlyPaths.map((path) => maxDrawdown(path).maxDrawdown));
    const riskAdjustedReturn = sharpeRatioValue * successRate;

    return {
      successRate,
      expectedValue,
      volatility,
      var95,
      cvar95,
      sharpeRatio: sharpeRatioValue,
      maxDrawdown: avgMaxDrawdown,
      riskAdjustedReturn,
    };
  }

  // 시드 생성
  generateSeed(etfCode, userId) {
    const etfHash = etfCode.split('').reduce((hash, char) => hash + char.charCodeAt(0), 0);
    const userHash = userId
      .toString()
      .split('')
      .reduce((hash, char) => hash + parseInt(char), 0);
    return etfHash + userHash;
  }

  // 목표 점수 계산
  calculateGoalScore(successRate, personalScore, riskAdjustedReturn) {
    const riskAdjustedScore = Math.min(100, riskAdjustedReturn / 10);
    return parseFloat(
      (successRate * 0.5 + riskAdjustedScore * 0.3 + personalScore * 0.2).toFixed(2)
    );
  }

  // === 기존 메서드들 (간소화) ===

  requiredCagr(targetAmount, initialAmount, monthlyContribution, years) {
    const totalMonths = years * 12;
    const totalContribution = initialAmount + monthlyContribution * totalMonths;
    if (totalContribution >= targetAmount) return 0;
    const requiredReturn = targetAmount / totalContribution;
    return Math.round((Math.pow(requiredReturn, 1 / years) - 1) * 100 * 100) / 100;
  }

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

  calculateHistoricalVolatility(prices) {
    if (prices.length < 2) return 0.15;
    const returns = calculateReturns(prices);
    const volatility = std(returns) * Math.sqrt(252);
    return Math.max(0.05, Math.min(0.5, volatility));
  }

  analyzeMarketRegime(prices) {
    if (!prices || prices.length < 60) return 'neutral';
    const recentPrices = prices.slice(-60);
    const olderPrices = prices.slice(-120, -60);
    const recentReturn = this.calculatePeriodReturn(recentPrices);
    const olderReturn = this.calculatePeriodReturn(olderPrices);
    const recentVolatility = this.calculatePeriodVolatility(recentPrices);
    const olderVolatility = this.calculatePeriodVolatility(olderPrices);

    if (recentReturn > 0.1 && recentVolatility < olderVolatility * 0.8) return 'bull';
    if (recentReturn < -0.1 && recentVolatility > olderVolatility * 1.2) return 'bear';
    if (recentVolatility > olderVolatility * 1.5) return 'volatile';
    return 'neutral';
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
    const stability = volatility < 0.5 ? 1.0 : Math.max(0.3, 1 - (volatility - 0.5));
    return completeness * 0.4 + continuity * 0.4 + stability * 0.2;
  }

  calculateEnhancedVolatility(historicalVolatility, marketRegime, personalScore) {
    const regimeMultipliers = {
      bull: 0.8,
      bear: 1.3,
      volatile: 1.5,
      neutral: 1.0,
    };
    const adjustedVolatility = historicalVolatility * regimeMultipliers[marketRegime];
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
}

module.exports = { SimpleMonteCarloEngine };
