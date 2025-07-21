// services/goalPlannerEngine/FiveYearEngine.js
const { GoalSimEngine } = require("./GoalSimEngine");
const config = require("../../config/goalPlanner");
const { getRiskScoreMap, getQuality } = require("../../dao/riskMetricsDao");

class FiveYearEngine extends GoalSimEngine {
  async simulate(input, etfData, connection) {
    const {
      targetAmount,
      targetYears,
      initialAmount,
      monthlyContribution,
      riskProfile,
      themePreference,
    } = input;

    const { windowLimit, contributionTiming, riskMatchSigma } = config;
    const windowSize = targetYears * 12;

    console.log("🧮 시뮬레이션 시작:", {
      etfCount: etfData.length,
      windowLimit,
      contributionTiming,
      riskMatchSigma,
    });

    // 1) 위험도 점수 맵 로드
    const riskMap = await getRiskScoreMap(connection);
    console.log("📊 위험도 점수 맵 로드 완료:", Object.keys(riskMap).length);

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

      // 4) RiskMatch via Gaussian
      const etfRisk = riskMap[etf.etf_code] ?? 50;
      const riskMatch =
        Math.exp(-Math.pow((etfRisk - riskProfile) / riskMatchSigma, 2)) * 100;

      // 5) QualityScore (비용·유동성·Premium)
      const quality = await getQuality(connection, etf.etf_code);

      const qualityScorePct = quality.quality_total * 100;

      const goalScore = parseFloat(
        (hitRate * 0.7 + riskMatch * 0.2 + quality.quality * 0.1).toFixed(2)
      );

      results.push({
        etf_code: etf.etf_code,
        etf_name: etf.etf_name,
        asset_class: etf.asset_class,
        theme: etf.theme,
        hit_rate: hitRate,
        risk_match: riskMatch,
        quality_score: qualityScorePct, // 0-1 스케일
        goal_score: goalScore,
        window_count: maxWin,
        expense_ratio: quality.cost * 100, // 0-1 스케일
        liquidity_score: quality.liquidity * 100, // 0-1 스케일
        quality_components: {
          cost: quality.cost * 100,
          liquidity: quality.liquidity * 100,
          quality: quality.quality * 100,
        },
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
          riskMatchSigma,
        },
      },
    };
  }

  dcaSim(monthlyRets, initialAmt, monthlyContr, timing = "end") {
    let pv = initialAmount;

    monthlyRets.forEach((LogRet, idx) => {
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
