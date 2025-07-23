// services/goalPlannerEngine/MonteCarloEngine.js
const { GoalSimEngine } = require('./GoalSimEngine');
const config = require('../../config/goalPlanner');
const { getPersonalScoreMap } = require('../../dao/riskMetricsDao');

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
    const simulations = 100; // 몬테카를로 시뮬레이션 횟수 (10,000 → 1,000으로 줄임)

    console.log('🎲 Monte Carlo 시뮬레이션 시작:', {
      etfCount: etfData.length,
      targetDays,
      simulations,
      userId: riskProfile,
    });

    // 1) 개인화 점수 맵 로드
    const personalMap = await getPersonalScoreMap(connection, riskProfile);
    console.log('📊 개인화 점수 맵 로드 완료:', Object.keys(personalMap).length);

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
      const scenarios = this.generateMonteCarloScenarios(dailyStats, targetDays, simulations);
      console.log(`✅ ${etf.etf_code} 시나리오 생성 완료: ${scenarios.length}개`);

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
          finalValue: this.dcaSimDaily(scenario, initialAmount, monthlyContribution),
          maxDrawdown: this.calculateMaxDrawdown(scenario),
          volatility: this.calculateVolatility(scenario),
          sharpeRatio: this.calculateSharpeRatio(scenario, 0.02), // 무위험 수익률 2% 가정
        };
      });
      console.log(`✅ ${etf.etf_code} DCA 시뮬레이션 완료`);

      // 5) 종합 분석
      const analysis = this.comprehensiveAnalysis(simulationResults, targetAmount);
      console.log(`📈 ${etf.etf_code} 분석 완료:`, {
        successRate: analysis.successRate.toFixed(2) + '%',
        expectedValue: Math.round(analysis.expectedValue).toLocaleString(),
        volatility: (analysis.volatility * 100).toFixed(2) + '%',
      });

      // 6) 개인화 점수
      const personalScore = personalMap[etf.etf_code] ?? 50;

      // 7) 최종 점수 계산 (성공률 60% + 개인화 점수 40%)
      const goalScore = parseFloat((analysis.successRate * 0.6 + personalScore * 0.4).toFixed(2));

      results.push({
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
        goal_score: goalScore,
        confidence_intervals: analysis.confidenceIntervals,
        simulation_count: simulations,
      });
    }

    // 목표 점수 순으로 정렬
    results.sort((a, b) => b.goal_score - a.goal_score);
    const topResults = results.slice(0, 10);

    const endTime = Date.now(); // 종료 시간 측정
    const calculationTime = ((endTime - startTime) / 1000).toFixed(1); // 초 단위

    console.log('✅ Monte Carlo 시뮬레이션 완료:', results.length, '개 ETF 처리');

    return {
      recommendations: topResults,
      meta: {
        simulationMethod: 'Monte Carlo',
        simulationCount: simulations,
        targetDays,
        dataHorizonMonths: config.dataHorizonMonths,
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
        config: {
          etfLimit: config.etfLimit,
        },
      },
    };
  }

  // 일별 통계 추출
  extractDailyStatistics(prices) {
    const dailyReturns = this.toDailyLogReturns(prices);

    // 수익률 통계 검증
    console.log('📊 수익률 통계:', {
      mean: dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length,
      volatility: Math.sqrt(
        dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / dailyReturns.length
      ),
      minReturn: Math.min(...dailyReturns),
      maxReturn: Math.max(...dailyReturns),
      dataPoints: dailyReturns.length,
    });

    const mean = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length;
    const variance =
      dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / dailyReturns.length;
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
  generateMonteCarloScenarios(dailyStats, targetDays, simulations) {
    const { mean, volatility, skewness, kurtosis } = dailyStats;
    const scenarios = [];

    for (let i = 0; i < simulations; i++) {
      const scenario = [];
      for (let day = 0; day < targetDays; day++) {
        // 정교한 일별 수익률 생성
        const dailyReturn = this.generateRealisticDailyReturn(mean, volatility, skewness, kurtosis);
        scenario.push(dailyReturn);
      }
      scenarios.push(scenario);
    }

    return scenarios;
  }

  // 현실적인 일별 수익률 생성
  generateRealisticDailyReturn(mean, volatility, skewness, kurtosis) {
    // 1. 기본 정규분포
    let return_ = this.generateNormalRandom(mean, volatility);

    // 2. 꼬리 위험 (극단적 이벤트) - 덧셈으로 변경
    if (Math.random() < 0.005) {
      // 0.5% 확률로 극단적 이벤트
      const extremeReturn = this.generateExtremeEvent(skewness);
      return_ += extremeReturn; // 곱셈이 아닌 덧셈으로 변경
    }

    // 3. 변동성 클러스터링 제거 (성능 및 정확성 문제로 인해)
    // return_ *= this.applyVolatilityClustering();

    // 4. 안전장치: 수익률 범위 제한
    return_ = Math.max(-0.15, Math.min(0.15, return_)); // ±15% 제한

    return return_;
  }

  // 정규분포 난수 생성
  generateNormalRandom(mean, volatility) {
    // Box-Muller 변환
    const u1 = Math.random();
    const u2 = Math.random();
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
  applyVolatilityClustering() {
    // 간단한 변동성 클러스터링 시뮬레이션
    return 1 + (Math.random() - 0.5) * 0.1; // ±5% 변동성
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

  // 변동성 계산
  calculateVolatility(scenario) {
    const mean = scenario.reduce((sum, ret) => sum + ret, 0) / scenario.length;
    const variance =
      scenario.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / scenario.length;
    return Math.sqrt(variance * 252); // 연간 변동성으로 변환
  }

  // 샤프 비율 계산
  calculateSharpeRatio(scenario, riskFreeRate) {
    const mean = scenario.reduce((sum, ret) => sum + ret, 0) / scenario.length;
    const volatility = this.calculateVolatility(scenario);
    const excessReturn = mean * 252 - riskFreeRate; // 연간 초과수익률
    return volatility > 0 ? excessReturn / volatility : 0;
  }

  // 종합 분석
  comprehensiveAnalysis(simulationResults, targetAmount) {
    const finalValues = simulationResults.map((result) => result.finalValue);

    // 디버깅 정보 추가
    console.log('🔍 분석 정보:', {
      targetAmount,
      finalValuesCount: finalValues.length,
      minValue: Math.min(...finalValues),
      maxValue: Math.max(...finalValues),
      avgValue: finalValues.reduce((sum, val) => sum + val, 0) / finalValues.length,
      successCount: finalValues.filter((value) => value >= targetAmount).length,
    });

    const sortedValues = finalValues.sort((a, b) => a - b);

    const successCount = finalValues.filter((value) => value >= targetAmount).length;
    const successRate = (successCount / finalValues.length) * 100;

    const expectedValue = finalValues.reduce((sum, val) => sum + val, 0) / finalValues.length;
    const volatility = this.calculateVolatilityFromValues(finalValues);

    const maxDrawdown = Math.max(...simulationResults.map((result) => result.maxDrawdown));
    const sharpeRatio =
      simulationResults.reduce((sum, result) => sum + result.sharpeRatio, 0) /
      simulationResults.length;

    // VaR (Value at Risk) - 95% 신뢰구간
    const var95 = sortedValues[Math.floor(sortedValues.length * 0.05)];

    // CVaR (Conditional VaR) - 최악의 5% 시나리오 평균
    const worst5Percent = sortedValues.slice(0, Math.floor(sortedValues.length * 0.05));
    const cvar95 = worst5Percent.reduce((sum, val) => sum + val, 0) / worst5Percent.length;

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
      sharpeRatio,
      var95,
      cvar95,
      confidenceIntervals,
    };
  }

  // 값들의 변동성 계산
  calculateVolatilityFromValues(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  // 왜도 계산
  calculateSkewness(returns, mean, volatility) {
    const n = returns.length;
    const skewness =
      returns.reduce((sum, ret) => sum + Math.pow((ret - mean) / volatility, 3), 0) / n;
    return skewness;
  }

  // 첨도 계산
  calculateKurtosis(returns, mean, volatility) {
    const n = returns.length;
    const kurtosis =
      returns.reduce((sum, ret) => sum + Math.pow((ret - mean) / volatility, 4), 0) / n;
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

  // 필요 CAGR 계산
  requiredCagr(targetAmount, initialAmount, monthlyContribution, years) {
    const totalMonths = years * 12;
    const totalContribution = initialAmount + monthlyContribution * totalMonths;

    if (totalContribution >= targetAmount) {
      return 0;
    }

    const requiredReturn = targetAmount / totalContribution;
    const cagr = Math.pow(requiredReturn, 1 / years) - 1;

    return Math.round(cagr * 100 * 100) / 100;
  }
}

module.exports = { MonteCarloEngine };
