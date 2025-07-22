const axios = require("axios");
const dayjs = require("dayjs");
const pool = require("../common/database");

const URL = "https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd";

// 거래일 여부 확인 (주말 제외)
function isTradingDay(date) {
  const day = date.day(); // 0: 일요일, 6: 토요일
  return day !== 0 && day !== 6;
}

// KRX ETF 일별 데이터 조회 함수
async function fetchKrEtfDaily(date) {
  const params = new URLSearchParams({
    bld: "dbms/MDC/STAT/standard/MDCSTAT04301",
    locale: "ko_KR",
    trdDd: date, // YYYYMMDD
    share: "1",
    money: "1",
    csvxls_isNo: "false",
  });

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Accept: "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    "X-Requested-With": "XMLHttpRequest",
    Origin: "https://data.krx.co.kr",
    Referer:
      "https://data.krx.co.kr/statisticsList/statisticsListIndex.do?menuId=menu_2_2_1&parmTabId=M_02_02_01_01",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  try {
    const res = await axios.post(URL, params, { headers });
    let etfList = [];
    if (Array.isArray(res.data)) {
      etfList = res.data;
    } else if (Array.isArray(res.data.OutBlock_1)) {
      etfList = res.data.OutBlock_1;
    } else if (Array.isArray(res.data.output)) {
      etfList = res.data.output;
    } else {
      console.warn("예상치 못한 응답 구조:", res.data);
      etfList = [];
    }
    return etfList;
  } catch (error) {
    if (error.response) {
      console.error(
        `[에러] ${date} HTTP ${error.response.status}:`,
        error.response.data
      );
    } else if (error.request) {
      console.error(`[에러] ${date} 네트워크 에러:`, error.message);
    } else {
      console.error(`[에러] ${date} 기타 에러:`, error.message);
    }
    return [];
  }
}

// 원하는 데이터만 필터링
function parseEtfRow(json, trade_date) {
  if (!json.ISU_SRT_CD) {
    return null;
  }
  // YYYYMMDD 형식을 YYYY-MM-DD 형식으로 변환
  const formattedDate = `${trade_date.substring(0, 4)}-${trade_date.substring(
    4,
    6
  )}-${trade_date.substring(6, 8)}`;
  return {
    trade_date: formattedDate,
    etf_code: json.ISU_SRT_CD || "NO_CODE",
    open_price: parseInt(json.TDD_OPNPRC?.replace(/,/g, "") || 0, 10),
    high_price: parseInt(json.TDD_HGPRC?.replace(/,/g, "") || 0, 10),
    low_price: parseInt(json.TDD_LWPRC?.replace(/,/g, "") || 0, 10),
    close_price: parseInt(json.TDD_CLSPRC?.replace(/,/g, "") || 0, 10),
    volume: parseInt(json.ACC_TRDVOL?.replace(/,/g, "") || 0, 10),
    nav_price: parseFloat(json.NAV?.replace(/,/g, "") || 0),
    change_rate: parseFloat(json.FLUC_RT || 0),
    aum: parseInt(json.INVSTASST_NETASST_TOTAMT?.replace(/,/g, "") || 0, 10),

    // 이 아래로는 새로 추가한 데이터
    cmp_prev_dd_price: parseInt(json.CMPPREVDD_PRC?.replace(/,/g, "") || 0, 10),
    acc_trd_val: parseInt(json.ACC_TRDVAL?.replace(/,/g, "") || 0, 10),
    mkt_cap: parseInt(json.MKTCAP?.replace(/,/g, "") || 0, 10),
    list_shrs: parseInt(json.LIST_SHRS?.replace(/,/g, "") || 0, 10),
    // 지수 관련 데이터
    idx_ind_nm: json.IDX_IND_NM?.replace(/,/g, "") || "NO_NAME",
    obj_stk_prc_idx: parseFloat(json.OBJ_STKPRC_IDX?.replace(/,/g, "") || 0),
    cmp_prev_dd_idx: parseFloat(json.CMPPREVDD_IDX?.replace(/,/g, "") || 0),
    fluc_rt1: parseFloat(json.FLUC_RT1?.replace(/,/g, "") || 0),
  };
}

/* ────────── 데이터베이스 저장 ────────── */
async function saveToDatabase(rows) {
  if (rows.length === 0) {
    console.log("저장할 데이터가 없습니다.");
    return;
  }

  const client = await pool.connect();
  try {
    console.log(`💾 ${rows.length}개 데이터를 데이터베이스에 저장 중...`);

    // etfs 테이블에 존재하는 ETF 코드만 필터링
    const etfCodes = [...new Set(rows.map((row) => row.etf_code))];
    const validEtfsResult = await client.query(
      "SELECT etf_code FROM etfs WHERE etf_code = ANY($1)",
      [etfCodes]
    );
    const validEtfCodes = new Set(
      validEtfsResult.rows.map((row) => row.etf_code)
    );

    const filteredRows = rows.filter((row) => validEtfCodes.has(row.etf_code));

    if (filteredRows.length !== rows.length) {
      console.log(
        `⚠️ ${
          rows.length - filteredRows.length
        }개의 유효하지 않은 ETF 코드 제거됨`
      );
    }

    if (filteredRows.length === 0) {
      console.log("저장할 유효한 데이터가 없습니다.");
      return;
    }

    console.log(`✅ ${filteredRows.length}개의 유효한 데이터 저장 시작...`);

    // 배치 삽입을 위한 쿼리
    const insertQuery = `
      INSERT INTO new_prices_daily (
        trade_date, etf_code, open_price, high_price, low_price, close_price,
        volume, nav_price, change_rate, aum, cmp_prev_dd_price, acc_trd_val,
        mkt_cap, list_shrs, idx_ind_nm, obj_stk_prc_idx, cmp_prev_dd_idx, fluc_rt1
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (trade_date, etf_code) DO UPDATE SET
        open_price = EXCLUDED.open_price,
        high_price = EXCLUDED.high_price,
        low_price = EXCLUDED.low_price,
        close_price = EXCLUDED.close_price,
        volume = EXCLUDED.volume,
        nav_price = EXCLUDED.nav_price,
        change_rate = EXCLUDED.change_rate,
        aum = EXCLUDED.aum,
        cmp_prev_dd_price = EXCLUDED.cmp_prev_dd_price,
        acc_trd_val = EXCLUDED.acc_trd_val,
        mkt_cap = EXCLUDED.mkt_cap,
        list_shrs = EXCLUDED.list_shrs,
        idx_ind_nm = EXCLUDED.idx_ind_nm,
        obj_stk_prc_idx = EXCLUDED.obj_stk_prc_idx,
        cmp_prev_dd_idx = EXCLUDED.cmp_prev_dd_idx,
        fluc_rt1 = EXCLUDED.fluc_rt1
    `;

    // 배치 처리 (1000개씩)
    const batchSize = 1000;
    for (let i = 0; i < filteredRows.length; i += batchSize) {
      const batch = filteredRows.slice(i, i + batchSize);
      const batchPromises = batch.map((row) =>
        client.query(insertQuery, [
          row.trade_date,
          row.etf_code,
          row.open_price,
          row.high_price,
          row.low_price,
          row.close_price,
          row.volume,
          row.nav_price,
          row.change_rate,
          row.aum,
          row.cmp_prev_dd_price,
          row.acc_trd_val,
          row.mkt_cap,
          row.list_shrs,
          row.idx_ind_nm,
          row.obj_stk_prc_idx,
          row.cmp_prev_dd_idx,
          row.fluc_rt1,
        ])
      );

      await Promise.all(batchPromises);
      console.log(
        `✅ ${Math.min(i + batchSize, filteredRows.length)}/${
          filteredRows.length
        }개 데이터 저장 완료`
      );
    }

    console.log(`🎉 총 ${filteredRows.length}개 데이터베이스 저장 완료!`);
  } catch (error) {
    console.error("❌ 데이터베이스 저장 실패:", error.message);
    throw error;
  } finally {
    client.release();
  }
}

// ETF 데이터 수집 및 저장 함수
async function collectEtfDailyData() {
  const endDate = dayjs().subtract(1, "day"); // 어제
  const startDate = dayjs().subtract(1, "day"); // 어제 (하루만)
  let allRows = [];
  let currentDate = startDate;
  let processedDays = 0;
  let totalDays = 1; // 하루만 처리

  console.log(`어제(${endDate.format("YYYY-MM-DD")}) ETF 데이터 수집 시작...`);

  // 어제 하루만 수집
  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, "day")) {
    const dateStr = currentDate.format("YYYYMMDD");

    if (!isTradingDay(currentDate)) {
      console.log(`[${dateStr}] 주말/공휴일 건너뜀`);
      currentDate = currentDate.add(1, "day");
      continue;
    }

    processedDays++;

    try {
      const etfList = await fetchKrEtfDaily(dateStr);
      if (!Array.isArray(etfList)) {
        console.error(
          `[${processedDays}/${totalDays}] ${dateStr} 데이터 형식 오류`
        );
        continue;
      }

      const rows = etfList
        .map((item) => parseEtfRow(item, dateStr))
        .filter((row) => row !== null); // null 값 제거

      allRows = allRows.concat(rows);

      if (rows.length > 0) {
        console.log(
          `[${processedDays}/${totalDays}] ${dateStr} 완료 (${rows.length}개)`
        );
      } else {
        console.log(
          `[${processedDays}/${totalDays}] ${dateStr} 완료 (0개) - 거래 없음`
        );
      }
    } catch (err) {
      console.error(
        `[${processedDays}/${totalDays}] ${dateStr} 실패:`,
        err.message
      );
    }

    await new Promise((r) => setTimeout(r, 1000)); // 1초 대기
    currentDate = currentDate.add(1, "day");
  }

  // CSV 대신 데이터베이스에 저장
  await saveToDatabase(allRows);
  console.log(`\n=== 수집 완료 ===`);
  console.log(`총 ${allRows.length}개 데이터 수집 및 DB 저장 완료`);
}

// 함수 export
module.exports = collectEtfDailyData;
