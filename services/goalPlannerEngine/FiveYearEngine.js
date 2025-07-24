// services/goalPlannerEngine/FiveYearEngine.js
const { GoalSimEngine } = require("./GoalSimEngine");
const config = require("../../config/goalPlanner");
const { getPersonalScoreMap } = require("../../dao/riskMetricsDao");

class FiveYearEngine extends GoalSimEngine {
  async simulate(input, etfData, connection) {
    const startTime = Date.now(); // 시작 시간 측정

    const {
      targetAmount,
      targetYears,
      initialAmount,
      monthlyContribution,
      riskProfile,
      themePreference,
    } = input;

    console.log("🧮 Five Year Engine 시작:", {
      etfCount: etfData.length,
      targetAmount,
      targetYears,
      initialAmount,
      monthlyContribution,
    });

    // 1) 개인화 점수 맵 로드
    const personalMap = await getPersonalScoreMap(connection, riskProfile);
    console.log(
      "📊 개인화 점수 맵 로드 완료:",
      Object.keys(personalMap).length
    );

    // 2) 설정값
    const windowSize = targetYears * 12; // 목표 년수 * 12개월
    const windowLimit = config.windowLimit; // 최대 윈도우 수
    const contributionTiming = config.contributionTiming; // 납입 시점

    console.log("⚙️ 설정값:", {
      windowSize,
      windowLimit,
      contributionTiming,
    });

    const results = [];

    for (const etf of etfData) {
      if (etf.prices.length < windowSize) continue; // 최소 데이터 필요

      console.log(`🔄 ETF 처리 중: ${etf.etf_code} (${etf.etf_name})`);

      // 3) 월별 수익률 계산
      const monthlyReturns = this.toMonthlyLogReturns(etf.prices);
      console.log(
        `📊 ${etf.etf_code} 월별 수익률 계산 완료: ${monthlyReturns.length}개월`
      );

      // 4) 슬라이딩 윈도우 분석
      const maxWin = Math.min(
        windowLimit,
        monthlyReturns.length - windowSize + 1
      );
      let successCount = 0;

      for (let i = 0; i < maxWin; i++) {
        const windowReturns = monthlyReturns.slice(i, i + windowSize);
        const finalValue = this.dcaSim(
          windowReturns,
          initialAmount,
          monthlyContribution,
          contributionTiming
        );

        if (finalValue >= targetAmount) {
          successCount++;
        }
      }

      // 5) 히트율 계산
      const hitRate = maxWin > 0 ? (successCount / maxWin) * 100 : 0;
      console.log(
        `📈 ${etf.etf_code} 히트율: ${hitRate.toFixed(2)}% (${successCount}/${maxWin})`
      );

      // 6) 개인화 점수
      const personalScore = personalMap[etf.etf_code] ?? 50; // 기본값 50

      // 7) 최종 점수 계산 (hitRate 70% + personal_score 30%)
      const goalScore = parseFloat(
        (hitRate * 0.7 + personalScore * 0.3).toFixed(2)
      );

      results.push({
        etf_code: etf.etf_code,
        etf_name: etf.etf_name,
        asset_class: etf.asset_class,
        theme: etf.theme,
        hit_rate: parseFloat(hitRate.toFixed(1)),
        personal_score: personalScore,
        goal_score: goalScore,
        window_count: maxWin,
      });
    }

    // 목표 점수 순으로 정렬
    results.sort((a, b) => b.goal_score - a.goal_score);
    const topResults = results.slice(0, 10);

    const endTime = Date.now(); // 종료 시간 측정
    const calculationTime = ((endTime - startTime) / 1000).toFixed(1); // 초 단위

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
        calculationTime: calculationTime, // "초" 제거
        confidenceLevel: 90, // "%" 제거하고 숫자만 (Five Year는 과거 데이터 기반이므로 90%)
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
}

module.exports = { FiveYearEngine };
