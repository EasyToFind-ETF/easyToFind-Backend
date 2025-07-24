/**
 * Monte Carlo 시뮬레이션 설정
 *
 * 목표: 시뮬레이션 파라미터의 중앙화 및 관리 용이성 향상
 * - 모든 Monte Carlo 엔진에서 공통으로 사용하는 설정
 * - 성능과 정확도의 균형을 위한 최적화된 기본값
 * - 환경별 설정 오버라이드 지원
 */

const monteCarloConfig = {
  // === 기본 시뮬레이션 설정 ===
  simulations: 2000, // 기본 경로 수 (정확도 vs 성능 균형)
  riskFreeRate: 0.02, // 무위험 수익률 (연 2%)
  maxMonthlyMove: 0.25, // 월별 수익률 소프트 캡 기준 (±25% 이상은 점차 포화)
  tailDf: 5, // t-분포 자유도 (fat-tail 현상 대응)

  // === 기본 시스템 설정 ===
  dataHorizonMonths: 60, // 데이터 수집 기간 (5년)
  etfLimit: 900, // 시가총액 상위 ETF 수
  maxYears: 5, // 최대 투자 기간
  contributionTiming: "end", // 납입 시점 (start/end)

  // === GARCH(1,1) 모델 설정 ===
  garch: {
    alpha: 0.12, // 충격의 영향력 (12%)
    beta: 0.86, // 변동성 지속성 (86%)
    omega: 1e-6, // 장기 평균 변동성
    enableGARCH: true, // GARCH 모델 사용 여부
    stabilityCheck: true, // 안정성 조건 검증 여부
  },

  // === 난수 생성 설정 ===
  random: {
    defaultSeed: 12345, // 기본 시드값
    enableSeededRng: true, // 시드 기반 난수 생성 사용
    qualityTest: false, // 난수 품질 테스트 실행 여부
  },

  // === 시장 상황별 설정 ===
  marketRegime: {
    // 시장 상황별 수익률 조정 계수
    bull: {
      returnMultiplier: 1.1, // 상승장 수익률 증폭
      volatilityMultiplier: 0.9, // 상승장 변동성 감소
      minReturn: 0.05, // 최소 수익률
      maxReturn: 0.25, // 최대 수익률
    },
    bear: {
      returnMultiplier: 0.9, // 하락장 수익률 감소
      volatilityMultiplier: 1.1, // 하락장 변동성 증폭
      minReturn: -0.02, // 최소 수익률
      maxReturn: 0.15, // 최대 수익률
    },
    volatile: {
      returnMultiplier: 1.0, // 변동성 장 중립
      volatilityMultiplier: 1.3, // 변동성 장 변동성 증폭
      minReturn: 0.02, // 최소 수익률
      maxReturn: 0.2, // 최대 수익률
    },
    neutral: {
      returnMultiplier: 1.0, // 중립장 중립
      volatilityMultiplier: 1.0, // 중립장 중립
      minReturn: 0.03, // 최소 수익률
      maxReturn: 0.18, // 최대 수익률
    },
  },

  // === 위험 지표 설정 ===
  riskMetrics: {
    varConfidence: 0.95, // VaR 신뢰수준
    cvarConfidence: 0.95, // CVaR 신뢰수준
    maxDrawdownThreshold: 0.3, // 최대 낙폭 임계값
    sharpeRatioMin: 0.5, // 최소 샤프 비율
    volatilityMax: 0.4, // 최대 변동성
  },

  // === 성능 최적화 설정 ===
  performance: {
    batchSize: 100, // 배치 처리 크기
    enableParallel: false, // 병렬 처리 사용 여부
    memoryLimit: 1000, // 메모리 사용량 제한 (MB)
    timeoutMs: 30000, // 시뮬레이션 타임아웃 (ms)
  },

  // === 데이터 품질 설정 ===
  dataQuality: {
    minDataPoints: 60, // 최소 데이터 포인트 수
    maxGapDays: 30, // 최대 허용 데이터 갭 (일)
    minPrice: 1.0, // 최소 가격
    maxPriceChange: 0.5, // 최대 일일 가격 변동
    completenessThreshold: 0.8, // 데이터 완성도 임계값
  },

  // === 목표 달성률 계산 설정 ===
  goalAchievement: {
    successThreshold: 0.6, // 성공 임계값 (60%)
    confidenceLevel: 0.9, // 신뢰수준 (90%)
    minSimulations: 100, // 최소 시뮬레이션 수
    maxSimulations: 10000, // 최대 시뮬레이션 수
  },

  // === 디버깅 및 로깅 설정 ===
  debugging: {
    enableLogs: false, // 디버깅 로그 활성화
    logLevel: "info", // 로그 레벨 (debug, info, warn, error)
    saveIntermediateResults: false, // 중간 결과 저장
    detailedScenarios: 5, // 상세 로깅할 시나리오 수
  },

  // === 환경별 설정 오버라이드 ===
  environments: {
    development: {
      simulations: 2000, // 모든 환경에서 2000개로 통일
      enableLogs: true,
      debugging: {
        enableLogs: true,
        detailedScenarios: 10,
      },
    },
    testing: {
      simulations: 2000, // 모든 환경에서 2000개로 통일
      random: {
        defaultSeed: 42, // 테스트용 고정 시드
        enableSeededRng: true,
      },
    },
    production: {
      simulations: 2000, // 모든 환경에서 2000개로 통일
      enableLogs: false,
      performance: {
        enableParallel: true,
      },
    },
  },
};

/**
 * 환경별 설정 가져오기
 * @param {string} environment - 환경명 (development, testing, production)
 * @returns {object} 환경별 설정
 */
function getConfig(environment = "production") {
  const baseConfig = { ...monteCarloConfig };

  // 환경별 설정이 있으면 오버라이드
  if (monteCarloConfig.environments[environment]) {
    const envConfig = monteCarloConfig.environments[environment];

    // 깊은 병합 수행
    Object.keys(envConfig).forEach((key) => {
      if (
        typeof envConfig[key] === "object" &&
        !Array.isArray(envConfig[key])
      ) {
        baseConfig[key] = { ...baseConfig[key], ...envConfig[key] };
      } else {
        baseConfig[key] = envConfig[key];
      }
    });
  }

  return baseConfig;
}

/**
 * 특정 설정값 가져오기
 * @param {string} path - 설정 경로 (예: 'simulations', 'marketRegime.bull.returnMultiplier')
 * @param {string} environment - 환경명
 * @returns {any} 설정값
 */
function getSetting(path, environment = "production") {
  const config = getConfig(environment);
  const keys = path.split(".");

  let value = config;
  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * 설정 유효성 검사
 * @param {object} config - 검사할 설정
 * @returns {object} { isValid, errors }
 */
function validateConfig(config) {
  const errors = [];

  // 필수 설정 검사
  if (!config.simulations || config.simulations < 1) {
    errors.push("simulations must be a positive number");
  }

  if (config.riskFreeRate < 0 || config.riskFreeRate > 1) {
    errors.push("riskFreeRate must be between 0 and 1");
  }

  if (config.maxMonthlyMove <= 0 || config.maxMonthlyMove > 1) {
    errors.push("maxMonthlyMove must be between 0 and 1");
  }

  if (config.tailDf <= 0) {
    errors.push("tailDf must be positive");
  }

  // 시장 상황별 설정 검사
  Object.keys(config.marketRegime).forEach((regime) => {
    const regimeConfig = config.marketRegime[regime];
    if (regimeConfig.minReturn >= regimeConfig.maxReturn) {
      errors.push(`${regime} regime: minReturn must be less than maxReturn`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 설정 초기화 및 검증
 * @param {string} environment - 환경명
 * @returns {object} 검증된 설정
 */
function initializeConfig(environment = "production") {
  const config = getConfig(environment);
  const validation = validateConfig(config);

  if (!validation.isValid) {
    console.warn("Monte Carlo 설정 검증 실패:", validation.errors);
    // 기본값으로 폴백
    return getConfig("production");
  }

  return config;
}

// 모듈 내보내기
module.exports = {
  monteCarloConfig,
  getConfig,
  getSetting,
  validateConfig,
  initializeConfig,
};

// 사용 예시 (주석 처리)
/*
// 기본 설정 가져오기
const config = require('./config/monteCarlo');
const settings = config.getConfig('production');

console.log('시뮬레이션 수:', settings.simulations);  // 2000
console.log('무위험 수익률:', settings.riskFreeRate); // 0.02

// 특정 설정값 가져오기
const bullReturnMultiplier = config.getSetting('marketRegime.bull.returnMultiplier');
console.log('상승장 수익률 증폭:', bullReturnMultiplier); // 1.1

// 개발환경 설정
const devConfig = config.getConfig('development');
console.log('개발환경 시뮬레이션 수:', devConfig.simulations); // 100

// 설정 검증
const validation = config.validateConfig(settings);
if (!validation.isValid) {
  console.error('설정 오류:', validation.errors);
}
*/
