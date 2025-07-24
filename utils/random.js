/**
 * Monte Carlo 엔진용 고품질 난수 생성 유틸리티
 *
 * 목표: 난수 품질/재현성 향상
 * - Mulberry32 알고리즘으로 시드 기반 난수 생성
 * - Box-Muller 변환으로 정규분포 난수 생성
 * - t-분포로 fat-tail 현상 대응
 */

/**
 * Mulberry32 알고리즘 기반 시드 난수 생성기
 * @param {number} seed - 시드값
 * @returns {function} 난수 생성 함수 (0~1 범위)
 */
function createSeededRng(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Box-Muller 변환을 사용한 정규분포 난수 쌍 생성
 * @param {function} rng - 난수 생성 함수
 * @returns {object} { z0, z1 } - 표준정규분포 난수 쌍
 */
function normalPair(rng) {
  const u1 = rng();
  const u2 = rng();

  // Box-Muller 변환
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);

  return { z0, z1 };
}

/**
 * Box-Muller 변환을 사용한 정규분포 난수 생성
 * @param {function} rng - 난수 생성 함수
 * @returns {number} 표준정규분포 난수
 */
function rngNormal(rng) {
  const { z0 } = normalPair(rng);
  return z0;
}

/**
 * t-분포 난수 생성 (fat-tail 현상 대응)
 * @param {number} df - 자유도 (degrees of freedom)
 * @param {function} rng - 난수 생성 함수
 * @returns {number} t-분포 난수
 */
function tStudent(df, rng) {
  // t-분포는 표준정규분포와 카이제곱분포의 비율로 생성
  const { z0 } = normalPair(rng);

  // 카이제곱분포 난수 생성 (감마분포 사용)
  let chi2 = 0;
  for (let i = 0; i < df; i++) {
    const { z0: normal } = normalPair(rng);
    chi2 += normal * normal;
  }

  return z0 / Math.sqrt(chi2 / df);
}

/**
 * 지수분포 난수 생성
 * @param {number} lambda - 지수분포 매개변수 (평균의 역수)
 * @param {function} rng - 난수 생성 함수
 * @returns {number} 지수분포 난수
 */
function exponential(lambda, rng) {
  return -Math.log(1 - rng()) / lambda;
}

/**
 * 감마분포 난수 생성 (Marsaglia and Tsang's method)
 * @param {number} shape - 형태 매개변수
 * @param {number} scale - 척도 매개변수
 * @param {function} rng - 난수 생성 함수
 * @returns {number} 감마분포 난수
 */
function gamma(shape, scale, rng) {
  if (shape < 1) {
    // shape < 1인 경우 다른 방법 사용
    const u = rng();
    const v = rng();
    const x = u ** (1 / shape);
    const y = v ** (1 / (1 - shape));
    return (x / (x + y)) * scale;
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    const { z0 } = normalPair(rng);
    const v = 1 + c * z0;

    if (v <= 0) continue;

    const v3 = v * v * v;
    const u = rng();

    if (u < 1 - 0.0331 * z0 * z0 * z0 * z0) {
      return d * v3 * scale;
    }

    if (Math.log(u) < 0.5 * z0 * z0 + d * (1 - v3 + Math.log(v3))) {
      return d * v3 * scale;
    }
  }
}

/**
 * 베타분포 난수 생성
 * @param {number} alpha - 알파 매개변수
 * @param {number} beta - 베타 매개변수
 * @param {function} rng - 난수 생성 함수
 * @returns {number} 베타분포 난수 (0~1 범위)
 */
function beta(alpha, beta, rng) {
  const x = gamma(alpha, 1, rng);
  const y = gamma(beta, 1, rng);
  return x / (x + y);
}

/**
 * 다변량 정규분포 난수 생성
 * @param {Array} mean - 평균 벡터
 * @param {Array} covariance - 공분산 행렬
 * @param {function} rng - 난수 생성 함수
 * @returns {Array} 다변량 정규분포 난수 벡터
 */
function multivariateNormal(mean, covariance, rng) {
  const n = mean.length;
  const result = new Array(n);

  // 표준정규분포 난수 생성
  for (let i = 0; i < n; i++) {
    const { z0 } = normalPair(rng);
    result[i] = z0;
  }

  // Cholesky 분해로 공분산 행렬 변환
  const L = choleskyDecomposition(covariance);

  // 변환 적용
  for (let i = 0; i < n; i++) {
    result[i] = mean[i];
    for (let j = 0; j <= i; j++) {
      result[i] += L[i][j] * result[j];
    }
  }

  return result;
}

/**
 * Cholesky 분해 (공분산 행렬을 하삼각행렬로 분해)
 * @param {Array} matrix - 대칭 양정부호 행렬
 * @returns {Array} 하삼각행렬
 */
function choleskyDecomposition(matrix) {
  const n = matrix.length;
  const L = Array(n)
    .fill()
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;

      if (j === i) {
        for (let k = 0; k < j; k++) {
          sum += L[j][k] * L[j][k];
        }
        L[j][j] = Math.sqrt(matrix[j][j] - sum);
      } else {
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }
        L[i][j] = (matrix[i][j] - sum) / L[j][j];
      }
    }
  }

  return L;
}

/**
 * 난수 품질 테스트 함수
 * @param {function} rng - 테스트할 난수 생성 함수
 * @param {number} samples - 샘플 수
 * @returns {object} 품질 지표들
 */
function testRandomQuality(rng, samples = 10000) {
  const values = [];
  for (let i = 0; i < samples; i++) {
    values.push(rng());
  }

  // 평균
  const mean = values.reduce((sum, val) => sum + val, 0) / samples;

  // 분산
  const variance =
    values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / samples;

  // 연속성 테스트 (연속된 값들의 상관관계)
  let autocorrelation = 0;
  for (let i = 1; i < samples; i++) {
    autocorrelation += (values[i] - mean) * (values[i - 1] - mean);
  }
  autocorrelation /= (samples - 1) * variance;

  return {
    mean,
    variance,
    autocorrelation,
    expectedMean: 0.5,
    expectedVariance: 1 / 12,
    meanError: Math.abs(mean - 0.5),
    varianceError: Math.abs(variance - 1 / 12),
  };
}

/**
 * 정규분포 품질 테스트
 * @param {function} rng - 난수 생성 함수
 * @param {number} samples - 샘플 수
 * @returns {object} 정규분포 품질 지표들
 */
function testNormalQuality(rng, samples = 10000) {
  const values = [];
  for (let i = 0; i < samples; i++) {
    const { z0 } = normalPair(rng);
    values.push(z0);
  }

  const mean = values.reduce((sum, val) => sum + val, 0) / samples;
  const variance =
    values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / samples;

  // 왜도 (skewness)
  const skewness =
    values.reduce((sum, val) => sum + (val - mean) ** 3, 0) /
    (samples * variance ** 1.5);

  // 첨도 (kurtosis)
  const kurtosis =
    values.reduce((sum, val) => sum + (val - mean) ** 4, 0) /
      (samples * variance ** 2) -
    3;

  return {
    mean,
    variance,
    skewness,
    kurtosis,
    expectedMean: 0,
    expectedVariance: 1,
    expectedSkewness: 0,
    expectedKurtosis: 0,
  };
}

// 모듈 내보내기
module.exports = {
  createSeededRng,
  normalPair,
  rngNormal,
  tStudent,
  exponential,
  gamma,
  beta,
  multivariateNormal,
  testRandomQuality,
  testNormalQuality,
};

// 사용 예시 (주석 처리)
/*
// 기본 사용법
const rng = createSeededRng(123);
const { z0, z1 } = normalPair(rng);

// t-분포 사용법
const tValue = tStudent(5, rng);

// 품질 테스트
const quality = testRandomQuality(rng, 10000);
console.log('난수 품질:', quality);

const normalQuality = testNormalQuality(rng, 10000);
console.log('정규분포 품질:', normalQuality);
*/
