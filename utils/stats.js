/**
 * Monte Carlo 엔진용 통계 계산 유틸리티
 *
 * 목표: 통계 계산 함수들의 모듈화 및 재사용성 향상
 * - 모든 함수는 순수함수 (부수효과 없음)
 * - 금융 위험 지표 계산 지원
 * - 성능 최적화된 구현
 */

/**
 * 산술평균 계산
 * @param {Array<number>} arr - 숫자 배열
 * @returns {number} 산술평균
 */
function mean(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return 0;
  }

  const sum = arr.reduce((acc, val) => acc + val, 0);
  return sum / arr.length;
}

/**
 * 표준편차 계산
 * @param {Array<number>} arr - 숫자 배열
 * @returns {number} 표준편차
 */
function std(arr) {
  if (!Array.isArray(arr) || arr.length < 2) {
    return 0;
  }

  const avg = mean(arr);
  const variance = arr.reduce((acc, val) => acc + (val - avg) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * 백분위수 계산
 * @param {Array<number>} arr - 숫자 배열
 * @param {number} p - 백분위수 (0~1 범위)
 * @returns {number} 백분위수 값
 */
function percentile(arr, p) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return 0;
  }

  if (p <= 0) return Math.min(...arr);
  if (p >= 1) return Math.max(...arr);

  // 배열을 오름차순으로 정렬
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;

  // 백분위수 위치 계산
  const index = p * (n - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }

  // 선형 보간
  const weight = index - lowerIndex;
  return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
}

/**
 * 샤프 비율 계산
 * @param {number} avg - 평균 수익률
 * @param {number} stdev - 표준편차
 * @param {number} rf - 무위험 수익률 (기본값: 0.02)
 * @returns {number} 샤프 비율
 */
function sharpeRatio(avg, stdev, rf = 0.02) {
  if (stdev === 0) {
    return 0;
  }

  return (avg - rf) / stdev;
}

/**
 * VaR (Value at Risk) 및 CVaR (Conditional VaR) 계산
 * @param {Array<number>} arr - 수익률 또는 포트폴리오 가치 배열
 * @param {number} alpha - 신뢰수준 (기본값: 0.95)
 * @returns {object} { var, cvar }
 */
function varCvar(arr, alpha = 0.95) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return { var: 0, cvar: 0 };
  }

  // VaR 계산 (1-alpha 백분위수)
  const varPercentile = 1 - alpha;
  const varValue = percentile(arr, varPercentile);

  // CVaR 계산 (VaR 이하 값들의 평균)
  const threshold = varValue;
  const tailValues = arr.filter((val) => val <= threshold);

  const cvarValue = tailValues.length > 0 ? mean(tailValues) : varValue;

  return {
    var: varValue,
    cvar: cvarValue,
  };
}

/**
 * 기하평균 계산 (복리 수익률용)
 * @param {Array<number>} arr - 양수 배열
 * @returns {number} 기하평균
 */
function geometricMean(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return 0;
  }

  // 음수나 0이 있는지 확인
  if (arr.some((val) => val <= 0)) {
    return 0;
  }

  const logSum = arr.reduce((acc, val) => acc + Math.log(val), 0);
  return Math.exp(logSum / arr.length);
}

/**
 * 왜도 (Skewness) 계산
 * @param {Array<number>} arr - 숫자 배열
 * @returns {number} 왜도
 */
function skewness(arr) {
  if (!Array.isArray(arr) || arr.length < 3) {
    return 0;
  }

  const avg = mean(arr);
  const stdev = std(arr);

  if (stdev === 0) {
    return 0;
  }

  const n = arr.length;
  const skew = arr.reduce((acc, val) => acc + ((val - avg) / stdev) ** 3, 0) / n;

  return skew;
}

/**
 * 첨도 (Kurtosis) 계산
 * @param {Array<number>} arr - 숫자 배열
 * @returns {number} 첨도
 */
function kurtosis(arr) {
  if (!Array.isArray(arr) || arr.length < 4) {
    return 0;
  }

  const avg = mean(arr);
  const stdev = std(arr);

  if (stdev === 0) {
    return 0;
  }

  const n = arr.length;
  const kurt = arr.reduce((acc, val) => acc + ((val - avg) / stdev) ** 4, 0) / n - 3;

  return kurt;
}

/**
 * 최대 낙폭 (Maximum Drawdown) 계산
 * @param {Array<number>} arr - 포트폴리오 가치 배열 (시간순)
 * @returns {object} { maxDrawdown, peakIndex, troughIndex }
 */
function maxDrawdown(arr) {
  if (!Array.isArray(arr) || arr.length < 2) {
    return { maxDrawdown: 0, peakIndex: 0, troughIndex: 0 };
  }

  let peak = arr[0];
  let peakIndex = 0;
  let maxDrawdown = 0;
  let troughIndex = 0;

  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > peak) {
      peak = arr[i];
      peakIndex = i;
    } else {
      const drawdown = (peak - arr[i]) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        troughIndex = i;
      }
    }
  }

  return {
    maxDrawdown,
    peakIndex,
    troughIndex,
  };
}

/**
 * 수익률 계산 (연속 복리 수익률)
 * @param {Array<object>} prices - 가격 배열 (각 요소는 {date, price, aum} 객체)
 * @returns {Array<number>} 로그 수익률 배열
 */
function calculateReturns(prices) {
  if (!Array.isArray(prices) || prices.length < 2) {
    return [];
  }

  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const prevPrice = prices[i - 1].price;
    const currPrice = prices[i].price;

    if (prevPrice > 0) {
      const logReturn = Math.log(currPrice / prevPrice);
      returns.push(logReturn);
    } else {
      returns.push(0);
    }
  }

  return returns;
}

/**
 * 연간화된 통계 계산
 * @param {Array<number>} returns - 수익률 배열
 * @param {number} periodsPerYear - 연간 기간 수 (예: 252일, 12개월)
 * @returns {object} 연간화된 통계
 */
function annualizeStats(returns, periodsPerYear = 252) {
  if (!Array.isArray(returns) || returns.length === 0) {
    return {
      annualizedReturn: 0,
      annualizedVolatility: 0,
      annualizedSharpeRatio: 0,
    };
  }

  const avgReturn = mean(returns);
  const volatility = std(returns);

  const annualizedReturn = avgReturn * periodsPerYear;
  const annualizedVolatility = volatility * Math.sqrt(periodsPerYear);
  const annualizedSharpeRatio = sharpeRatio(annualizedReturn, annualizedVolatility);

  return {
    annualizedReturn,
    annualizedVolatility,
    annualizedSharpeRatio,
  };
}

/**
 * 상관관계 계산
 * @param {Array<number>} x - 첫 번째 배열
 * @param {Array<number>} y - 두 번째 배열
 * @returns {number} 피어슨 상관계수
 */
function correlation(x, y) {
  if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length || x.length < 2) {
    return 0;
  }

  const n = x.length;
  const xMean = mean(x);
  const yMean = mean(y);

  let numerator = 0;
  let xSumSq = 0;
  let ySumSq = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;

    numerator += xDiff * yDiff;
    xSumSq += xDiff * xDiff;
    ySumSq += yDiff * yDiff;
  }

  const denominator = Math.sqrt(xSumSq * ySumSq);

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * 신뢰구간 계산
 * @param {Array<number>} arr - 숫자 배열
 * @param {number} confidence - 신뢰수준 (기본값: 0.95)
 * @returns {object} { lower, upper, mean }
 */
function confidenceInterval(arr, confidence = 0.95) {
  if (!Array.isArray(arr) || arr.length < 2) {
    return { lower: 0, upper: 0, mean: 0 };
  }

  const avg = mean(arr);
  const stdev = std(arr);
  const n = arr.length;

  // t-분포의 임계값 (대략적인 근사)
  const alpha = 1 - confidence;
  const tValue = 1.96; // 95% 신뢰구간용 (정확한 t-분포는 더 복잡)

  const marginOfError = tValue * (stdev / Math.sqrt(n));

  return {
    lower: avg - marginOfError,
    upper: avg + marginOfError,
    mean: avg,
  };
}

/**
 * 통계 요약 정보 계산
 * @param {Array<number>} arr - 숫자 배열
 * @returns {object} 통계 요약
 */
function summaryStats(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return {
      count: 0,
      mean: 0,
      std: 0,
      min: 0,
      max: 0,
      median: 0,
      q25: 0,
      q75: 0,
      skewness: 0,
      kurtosis: 0,
    };
  }

  const sorted = [...arr].sort((a, b) => a - b);

  return {
    count: arr.length,
    mean: mean(arr),
    std: std(arr),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: percentile(arr, 0.5),
    q25: percentile(arr, 0.25),
    q75: percentile(arr, 0.75),
    skewness: skewness(arr),
    kurtosis: kurtosis(arr),
  };
}

// 모듈 내보내기
module.exports = {
  mean,
  std,
  percentile,
  sharpeRatio,
  varCvar,
  geometricMean,
  skewness,
  kurtosis,
  maxDrawdown,
  calculateReturns,
  annualizeStats,
  correlation,
  confidenceInterval,
  summaryStats,
};

// 사용 예시 (주석 처리)
/*
// 기본 통계 계산
const data = [1, 2, 3, 4, 5];
console.log('평균:', mean(data));           // 3
console.log('표준편차:', std(data));        // 1.5811...

// 백분위수 계산
console.log('중앙값:', percentile(data, 0.5));  // 3
console.log('25% 백분위수:', percentile(data, 0.25)); // 2

// 금융 지표 계산
const returns = [0.01, -0.02, 0.03, -0.01, 0.02];
const avgReturn = mean(returns);
const volatility = std(returns);
console.log('샤프 비율:', sharpeRatio(avgReturn, volatility));

// VaR/CVaR 계산
const { var: var95, cvar: cvar95 } = varCvar(returns, 0.95);
console.log('VaR(95%):', var95);
console.log('CVaR(95%):', cvar95);

// 최대 낙폭 계산
const portfolioValues = [100, 105, 98, 110, 95, 108];
const { maxDrawdown } = maxDrawdown(portfolioValues);
console.log('최대 낙폭:', maxDrawdown);

// 통계 요약
const summary = summaryStats(returns);
console.log('통계 요약:', summary);
*/
