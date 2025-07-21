import axios from 'axios';
import dayjs from 'dayjs';
import fs from 'fs';

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
        csvxls_isNo: "false"
    });

    const headers = {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": "https://data.krx.co.kr",
        "Referer": "https://data.krx.co.kr/statisticsList/statisticsListIndex.do?menuId=menu_2_2_1&parmTabId=M_02_02_01_01",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
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
            console.warn('예상치 못한 응답 구조:', res.data);
            etfList = [];
        }
        return etfList;
    } catch (error) {
        if (error.response) {
            console.error(`[에러] ${date} HTTP ${error.response.status}:`, error.response.data);
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
    const formattedDate = `${trade_date.substring(0, 4)}-${trade_date.substring(4, 6)}-${trade_date.substring(6, 8)}`;
    return {
        trade_date: formattedDate,
        etf_code: json.ISU_SRT_CD || 'NO_CODE',
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
        idx_ind_nm: json.IDX_IND_NM?.replace(/,/g, "") || 'NO_NAME',
        obj_stk_prc_idx: parseFloat(json.OBJ_STKPRC_IDX?.replace(/,/g, "") || 0),
        cmp_prev_dd_idx: parseFloat(json.CMPPREVDD_IDX?.replace(/,/g, "") || 0),
        fluc_rt1: parseFloat(json.FLUC_RT1?.replace(/,/g, "") || 0),
    };
}

// CSV 저장 함수
function saveToCsv(rows, fileName) {
    if (!rows.length) return;
    const columns = [
        "trade_date", "etf_code", "open_price", "high_price", "low_price",
        "close_price", "volume", "nav_price", "change_rate", "aum",
        "cmp_prev_dd_price", "acc_trd_val", "mkt_cap", "list_shrs",
        "idx_ind_nm", "obj_stk_prc_idx", "cmp_prev_dd_idx", "fluc_rt1"
    ];
    const header = columns.join(",");
    const csvRows = rows.map(row => columns.map(col => row[col]).join(","));
    const csv = [header, ...csvRows].join("\n");
    fs.writeFileSync(fileName, csv, "utf8");

    console.log(`[샘플] 저장될 데이터: ${header}`);
    for (let i = 0; i < Math.min(3, rows.length); i++) {
        console.log(csvRows[i]);
    }
    console.log(`[완료] CSV 저장됨: ${fileName}`);
}

// ETF 데이터 수집 및 저장
(async () => {
    // const endDate = dayjs(); // 오늘
    const endDate = dayjs('2025-07-21');
    // const startDate = dayjs().subtract(5, 'year'); // 5년 전
    const startDate = dayjs('2020-07-13');
    let allRows = [];
    let currentDate = startDate;
    let processedDays = 0;
    let totalDays = 0;

    // 전체 거래일 수 계산
    let tempDate = startDate.clone();
    while (tempDate.isBefore(endDate) || tempDate.isSame(endDate, 'day')) {
        if (isTradingDay(tempDate)) {
            totalDays++;
        }
        tempDate = tempDate.add(1, 'day');
    }

    console.log(`총 ${totalDays}개 거래일 처리 시작...`);

    // 2020-07-13부터 오늘까지 전체 거래일 수집
    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
        const dateStr = currentDate.format("YYYYMMDD");

        if (!isTradingDay(currentDate)) {
            console.log(`[${dateStr}] 주말/공휴일 건너뜀`);
            currentDate = currentDate.add(1, 'day');
            continue;
        }

        processedDays++;

        try {
            const etfList = await fetchKrEtfDaily(dateStr);
            if (!Array.isArray(etfList)) {
                console.error(`[${processedDays}/${totalDays}] ${dateStr} 데이터 형식 오류`);
                continue;
            }

            const rows = etfList
                .map(item => parseEtfRow(item, dateStr))
                .filter(row => row !== null); // null 값 제거

            allRows = allRows.concat(rows);

            if (rows.length > 0) {
                console.log(`[${processedDays}/${totalDays}] ${dateStr} 완료 (${rows.length}개)`);
            } else {
                console.log(`[${processedDays}/${totalDays}] ${dateStr} 완료 (0개) - 거래 없음`);
            }
        } catch (err) {
            console.error(`[${processedDays}/${totalDays}] ${dateStr} 실패:`, err.message);
        }

        await new Promise(r => setTimeout(r, 10));
        currentDate = currentDate.add(1, 'day');
    }

    const fileName = `services/output/etf_prices_${startDate.format("YYYY-MM-DD")}_${endDate.format("YYYY-MM-DD")}.csv`;
    saveToCsv(allRows, fileName);
    console.log(`\n=== 수집 완료 ===`);
    console.log(`총 ${allRows.length}개 데이터 수집`);
    console.log(`파일 저장: ${fileName}`);
})();
