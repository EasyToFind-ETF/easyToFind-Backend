// services/goalPlannerEngine/FiveYearEngine.js
const { GoalSimEngine } = require("./GoalSimEngine");

class FiveYearEngine extends GoalSimEngine {
  async simulate(input, etfData) {
    const {
      targetAmount,
      targetYears,
      initialAmount,
      monthlyContribution,
      riskProfile,
      themePreference,
    } = input;

    const windowSize = targetYears * 12; // 개월 단위
    const maxWindows = 60 - windowSize + 1; // 최대 윈도우 개수

    const results = [];

    for (const etf of etfData) {
      if (etf.prices.length < windowSize) continue;

      const hitRate = this.calculateHitRate(
        etf.prices,
        targetAmount,
        initialAmount,
        monthlyContribution,
        windowSize,
        maxWindows
      );

      const riskMatch = this.calculateRiskMatch(etf, riskProfile);
      const goalScore = this.calculateGoalScore(hitRate, riskMatch);

      results.push({
        etf_code: etf.etf_code,
        etf_name: etf.etf_name,
        asset_class: etf.asset_class,
        theme: etf.theme,
        hit_rate: hitRate,
        risk_match: riskMatch,
        goal_score: goalScore,
        window_count: maxWindows,
      });
    }

    // 목표 점수 순으로 정렬
    results.sort((a, b) => b.goal_score - a.goal_score);

    // 상위 10개만 반환
    const topResults = results.slice(0, 10);

    return {
      recommendations: topResults,
      meta: {
        dataHorizonMonths: 60,
        windowCount: maxWindows,
        reliability: this.getReliabilityLevel(maxWindows),
        targetAmount,
        targetYears,
        requiredCAGR: this.calculateRequiredCAGR(
          targetAmount,
          initialAmount,
          monthlyContribution,
          targetYears
        ),
      },
    };
  }

  calculateHitRate(
    prices,
    targetAmount,
    initialAmount,
    monthlyContribution,
    windowSize,
    maxWindows
  ) {
    let hitCount = 0;
    let totalWindows = 0;

    for (let i = 0; i <= prices.length - windowSize; i++) {
      const windowPrices = prices.slice(i, i + windowSize);
      const startPrice = windowPrices[0].price;
      const endPrice = windowPrices[windowPrices.length - 1].price;

      // CAGR 계산
      const totalReturn = (endPrice - startPrice) / startPrice;
      const cagr = Math.pow(1 + totalReturn, 1 / (windowSize / 12)) - 1;

      // 목표 달성 시뮬레이션
      let currentAmount = initialAmount;
      for (let month = 0; month < windowSize; month++) {
        const monthlyReturn = Math.pow(1 + cagr, 1 / 12) - 1;
        currentAmount =
          (currentAmount + monthlyContribution) * (1 + monthlyReturn);
      }

      if (currentAmount >= targetAmount) {
        hitCount++;
      }
      totalWindows++;
    }

    return totalWindows > 0 ? (hitCount / totalWindows) * 100 : 0;
  }

  calculateRiskMatch(etf, riskProfile) {
    // 간단한 위험도 계산 (변동성 기반)
    const prices = etf.prices.map((p) => p.price);
    const returns = [];

    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const volatility = Math.sqrt(
      returns.reduce((sum, r) => sum + r * r, 0) / returns.length
    );
    const etfRiskScore = Math.min(volatility * 1000, 100); // 0-100 스케일로 변환

    // 위험도 매칭 점수 계산 (가우시안 함수 사용)
    const riskMatch =
      Math.exp(-Math.pow((etfRiskScore - riskProfile) / 20, 2)) * 100;

    return Math.round(riskMatch * 100) / 100;
  }

  calculateGoalScore(hitRate, riskMatch) {
    // 목표 점수 = 히트율 * 0.7 + 위험도 매칭 * 0.3
    return Math.round((hitRate * 0.7 + riskMatch * 0.3) * 100) / 100;
  }

  getReliabilityLevel(windowCount) {
    if (windowCount >= 36) return "high";
    if (windowCount >= 12) return "medium";
    return "low";
  }

  calculateRequiredCAGR(
    targetAmount,
    initialAmount,
    monthlyContribution,
    years
  ) {
    // 목표 달성을 위한 필요 CAGR 계산
    const totalMonths = years * 12;
    const totalContribution = initialAmount + monthlyContribution * totalMonths;

    if (totalContribution >= targetAmount) {
      return 0; // 납입액만으로도 목표 달성 가능
    }

    // CAGR 계산 공식
    const requiredReturn = targetAmount / totalContribution;
    const cagr = Math.pow(requiredReturn, 1 / years) - 1;

    return Math.round(cagr * 100 * 100) / 100; // 퍼센트로 반환
  }
}

module.exports = { FiveYearEngine };
