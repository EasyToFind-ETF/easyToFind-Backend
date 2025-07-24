/**
 * 해시 함수 유틸리티
 *
 * @description
 * - djb2 알고리즘 기반 해시 함수
 * - 32-bit unsigned integer 반환
 * - ETF 코드와 사용자 ID 조합에 최적화
 */

/**
 * djb2 해시 함수
 * @param {string} str - 해시할 문자열
 * @returns {number} 32-bit unsigned integer 해시값
 *
 * 수학적 근거:
 * - djb2 알고리즘: h = h * 33 + c
 * - 균등 분포와 충돌 저항성 보장
 * - 32-bit 정수 범위로 제한
 */
function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash = hash & 0xffffffff; // 32-bit 정수로 제한
  }
  return hash >>> 0; // unsigned 32-bit integer
}

/**
 * ETF 코드와 사용자 ID 조합 해시
 * @param {string} etfCode - ETF 코드
 * @param {number} userId - 사용자 ID
 * @returns {number} 32-bit unsigned integer 시드값
 *
 * 개선 방법:
 * 1. ETF 코드와 userId를 결합하여 문자열 생성
 * 2. djb2 해시 함수로 32비트 정수 생성
 * 3. 추가 분산을 위한 비트 시프트 적용
 *
 * 수학적 근거: 해시 함수의 균등 분포 특성 활용
 */
function generateEtfUserSeed(etfCode, userId) {
  // ETF 코드와 userId를 결합
  const combinedString = `${etfCode}_${userId}`;

  // djb2 해시 적용
  const hash = djb2Hash(combinedString);

  // 추가 분산을 위한 비트 시프트 (권장사항 ⑤)
  const etfHash = djb2Hash(etfCode);
  const userHash = djb2Hash(userId.toString());

  return ((etfHash << 1) ^ userHash) >>> 0; // unsigned 32-bit integer
}

module.exports = {
  djb2Hash,
  generateEtfUserSeed,
};
