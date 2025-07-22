// services/goalPlannerEngine/FiveYearEngine.js
const { GoalSimEngine } = require("./GoalSimEngine");
const config = require("../../config/goalPlanner");
const { getPersonalScoreMap } = require("../../dao/riskMetricsDao");

class FiveYearEngine extends GoalSimEngine {
  async simulate(input, etfData, connection) {
    const {
      targetAmount,
      targetYears,
      initialAmount,
      monthlyContribution,
      riskProfile, // 이제 userId로 사용
      themePreference,
    } = input;

    const { windowLimit, contributionTiming } = config;
    const windowSize = targetYears * 12;

    console.log("🧮 시뮬레이션 시작:", {
      etfCount: etfData.length,
      windowLimit,
      contributionTiming,
      userId: riskProfile, // userId로 변경
    });

    // 1) 개인화 점수 맵 로드 (userId 기반)
    const personalMap = await getPersonalScoreMap(connection, riskProfile);
    console.log(
      "📊 개인화 점수 맵 로드 완료:",
      Object.keys(personalMap).length
    );

    const results = [];

    for (const etf of etfData) {
      if (etf.prices.length < windowSize) continue;

      // 2) 모든 월별 로그수익률 벡터화
      const monthlyRets = this.toMonthlyLogReturns(etf.prices);

      // 3) 창 개수 결정 (≤ windowLimit, else full)
      const maxWin = Math.min(windowLimit, monthlyRets.length - windowSize + 1);

      let hit = 0;
      for (let w = 0; w < maxWin; w++) {
        const sliceRets = monthlyRets.slice(w, w + windowSize);
        const endVal = this.dcaSim(
          sliceRets,
          initialAmount,
          monthlyContribution,
          contributionTiming
        );

        if (endVal >= targetAmount) hit++;
      }

      const hitRate = (hit / maxWin) * 100;

      // 4) 개인화 점수 (기존 위험도 매칭 대체)
      const personalScore = personalMap[etf.etf_code] ?? 50; // 기본값 50

      // 5) 최종 점수 계산 (hitRate 70% + personal_score 30%)
      const goalScore = parseFloat(
        (hitRate * 0.7 + personalScore * 0.3).toFixed(2)
      );

      results.push({
        etf_code: etf.etf_code,
        etf_name: etf.etf_name,
        asset_class: etf.asset_class,
        theme: etf.theme,
        hit_rate: hitRate,
        personal_score: personalScore,
        goal_score: goalScore,
        window_count: maxWin,
      });
    }

    // 목표 점수 순으로 정렬
    results.sort((a, b) => b.goal_score - a.goal_score);
    const topResults = results.slice(0, 10);

    console.log("✅ 시뮬레이션 완료:", results.length, "개 ETF 처리");

    return {
      recommendations: topResults,
      meta: {
        dataHorizonMonths: config.dataHorizonMonths,
        windowCount: Math.min(windowLimit, 60 - windowSize + 1),
        reliability: this.getReliabilityLevel(
          Math.min(windowLimit, 60 - windowSize + 1)
        ),
        targetAmount,
        targetYears,
        requiredCAGR: this.requiredCagr(
          targetAmount,
          initialAmount,
          monthlyContribution,
          targetYears
        ),
        config: {
          windowLimit,
          etfLimit: config.etfLimit,
          contributionTiming,
        },
      },
    };
  }

  dcaSim(monthlyRets, initialAmt, monthlyContr, timing = "end") {
    let pv = initialAmt;

    monthlyRets.forEach((logRet, idx) => {
      const monthlyReturn = Math.exp(logRet) - 1;

      if (timing === "start") {
        pv += monthlyContr;
      }

      pv *= 1 + monthlyReturn;

      if (timing === "end") {
        pv += monthlyContr;
      }
    });

    return pv;
  }

  toMonthlyLogReturns(prices) {
    const monthlyReturns = [];

    for (let i = 1; i < prices.length; i++) {
      const prevPrice = prices[i - 1].price;
      const currPrice = prices[i].price;
      const logReturn = Math.log(currPrice / prevPrice);
      monthlyReturns.push(logReturn);
    }

    return monthlyReturns;
  }

  getReliabilityLevel(windowCount) {
    if (windowCount >= 36) return "high";
    if (windowCount >= 12) return "medium";
    return "low";
  }

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

module.exports = { FiveYearEngine };
