// 리스크 계산 로직
const FIXED_SEED = 2000;
const FIXED_LEV = 100;

/**
 * 진입가와 손절가를 기반으로 포지션 계산
 * @param {number[]} entries - 진입가 배열 (1~3개)
 * @param {number} stop - 손절가
 * @returns {Object} 계산 결과
 */
function calculatePosition(entries, stop) {
  // 유효성 검사
  if (!entries || entries.length === 0) {
    throw new Error("최소 1개의 진입가가 필요합니다.");
  }

  if (!stop || stop <= 0) {
    throw new Error("유효한 손절가를 입력해주세요.");
  }

  // 평균 진입 단가 계산
  const avgEntry = entries.reduce((sum, price) => sum + price, 0) / entries.length;

  // 총 리스크 (시드의 2%)
  const totalRisk = FIXED_SEED * 0.02;

  // 진입가와 손절가 차이
  const priceDiff = Math.abs(avgEntry - stop);

  if (priceDiff === 0) {
    throw new Error("진입가와 손절가가 같을 수 없습니다.");
  }

  // 총 코인 수량
  const totalQty = totalRisk / priceDiff;

  // 총 포지션 사이즈
  const totalSize = totalQty * avgEntry;

  // 총 증거금
  const totalMargin = totalSize / FIXED_LEV;

  // 회차별 계산
  const entryCount = entries.length;
  const perQty = totalQty / entryCount;
  const perSize = totalSize / entryCount;
  const perMargin = totalMargin / entryCount;

  return {
    seed: FIXED_SEED,
    leverage: FIXED_LEV,
    entries,
    stop,
    avgEntry: Number(avgEntry.toFixed(4)),
    totalRisk: Number(totalRisk.toFixed(2)),
    totalQty: Number(totalQty.toFixed(4)),
    totalSize: Number(totalSize.toFixed(2)),
    totalMargin: Number(totalMargin.toFixed(2)),
    entryCount,
    perQty: Number(perQty.toFixed(4)),
    perSize: Number(perSize.toFixed(2)),
    perMargin: Number(perMargin.toFixed(2))
  };
}

/**
 * 계산 결과를 텔레그램 메시지 형식으로 포맷팅
 * @param {Object} result - calculatePosition의 결과
 * @returns {string} 포맷된 메시지
 */
function formatResultMessage(result) {
  const { entries, stop, avgEntry, totalQty, totalSize, totalMargin,
          perQty, perSize, perMargin, totalRisk, entryCount } = result;

  const entriesText = entries.map((v, i) => `E${i+1}: ${v}`).join('\n');

  return `
🧮 *3STEP POSITION 계산 결과*

📊 *기본 정보*
• 시드: ${FIXED_SEED} USDT
• 레버리지: ${FIXED_LEV}x
• 리스크(2%): ${totalRisk} USDT

💰 *진입 정보*
${entriesText}
• 손절가: ${stop}
• 평균 진입가: ${avgEntry}

📈 *포지션 요약*
• 총 코인 수량: ${totalQty}
• 총 포지션 사이즈: ${totalSize} USDT
• 총 증거금: ${totalMargin} USDT

🔄 *${entryCount}회 분할 진입 (1회당)*
• 코인 수량: ${perQty}
• 포지션 사이즈: ${perSize} USDT
• 증거금: ${perMargin} USDT

⚠️ *주의사항*
50~100배 고배율 사용 시 슬리피지에 주의하세요.
계산된 수량은 손절 시 시드의 2% 손실을 보장합니다.
`.trim();
}

module.exports = {
  calculatePosition,
  formatResultMessage,
  FIXED_SEED,
  FIXED_LEV
};
