const axios = require("axios");
const fs = require("fs");
const path = require("path");
const dayjs = require("dayjs");
require("dotenv").config();

const APP_KEY = process.env.KI_APP_KEY;
const APP_SECRET = process.env.KI_APP_SECRET;
const BASE_URL = "https://openapi.koreainvestment.com:9443";

// 개발 환경에서는 아래 토큰 사용하기
const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ0b2tlbiIsImF1ZCI6IjA2ZWM5MzQxLTk2ZmMtNGY5MS1hY2U1LWU5M2UyNWU5MDgzOCIsInByZHRfY2QiOiIiLCJpc3MiOiJ1bm9ndyIsImV4cCI6MTc1MjI3NzE5NiwiaWF0IjoxNzUyMTkwNzk2LCJqdGkiOiJQUzJOSFVobEVjcTJrY3RwR1BQUHVxa2tEU09wQVdQSlY0Z0kifQ.ojYn4UlLzL0S0dTcOgcgmYg6TRYZVllwpjThI4zsznGPWGA1pSuuZmT-19k5QJ069e2PRVCfzuHZ05CbuK6l5A";

// Access Token 발급
// 개발 환경에서는 아래 함수 사용하지 말 것, 계속 요청되는 이슈 있음, 하드코딩 토큰 사용하기
// async function getAccessToken() {
//     const url = `${BASE_URL}/oauth2/tokenP`;

//     const headers = {
//         "Content-Type": "application/json",
//     };

//     const body = {
//         grant_type: "client_credentials",
//         appkey: APP_KEY,
//         appsecret: APP_SECRET,
//     };

//     try {
//         const res = await axios.post(url, body, { headers });
//         return res.data.access_token;
//     } catch (err) {
//         if (err.response) {
//             console.error("[토큰 에러]", err.response.status, err.response.data);
//         } else {
//             console.error("[토큰 예외]", err.message);
//         }
//         throw err;
//     }
// }

// 네이버에서 ETF 종목코드 크롤링
async function fetchEtfCodesArray() {
    const url = "https://finance.naver.com/api/sise/etfItemList.nhn";
    const res = await axios.get(url);
    const etfList = res.data?.result?.etfItemList || [];
    return etfList.map((item) => item.itemcode);
}

// ETF 시세 조회
async function getEtfPrice(etfCode) {
    const url = `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`;

    const headers = {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        appkey: APP_KEY,
        appsecret: APP_SECRET,
        tr_id: "FHKST01010100",
        custtype: "P",
    };

    const params = {
        fid_cond_mrkt_div_code: "J",
        fid_input_iscd: etfCode,
    };

    const res = await axios.get(url, { headers, params });
    return res.data.output;
}

// 전체 ETF 시세 수집
async function collectEtfPricesFromCodes(etfCodes, startDate, endDate) {
    const results = [];

    // 날짜 범위 생성 (3년치)
    const dates = [];
    let currentDate = dayjs(startDate);
    const end = dayjs(endDate);

    while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
        dates.push(currentDate.format("YYYYMMDD"));
        currentDate = currentDate.add(1, 'day');
    }

    console.log(`[INFO] 총 ${dates.length}일, ${etfCodes.length}개 종목에 대해 시세 수집 시작`);

    for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
        const tradeDate = dates[dateIndex];
        console.log(`[${dateIndex + 1}/${dates.length}] 날짜: ${tradeDate} 처리 중...`);

        for (let i = 0; i < etfCodes.length; i++) {
            const code = etfCodes[i];
            try {
                const data = await getEtfPrice(code);
                const row = {
                    trade_date: tradeDate,
                    etf_code: code,
                    open_price: parseInt(data.stck_oprc || null),
                    high_price: parseInt(data.stck_hgpr || null),
                    low_price: parseInt(data.stck_lwpr || null),
                    close_price: parseInt(data.stck_prpr || null),
                    volume: parseInt(data.acml_vol || null),
                    nav_price: parseFloat(data.nav || null),
                    change_rate: parseFloat(data.prdy_ctrt || null),
                    aum: parseInt(data.etf_ntas_ttam || null),
                };
                results.push(row);
                console.log(`[${dateIndex + 1}/${dates.length}][${i + 1}/${etfCodes.length}] ✅ ${tradeDate} ${code} 완료`);
                await new Promise((r) => setTimeout(r, 1000));
            } catch (err) {
                if (err.response) {
                    console.error(`[${dateIndex + 1}/${dates.length}][${i + 1}/${etfCodes.length}] ❌ ${tradeDate} ${code}:`, err.response.status, err.response.data);
                } else {
                    console.error(`[${dateIndex + 1}/${dates.length}][${i + 1}/${etfCodes.length}] ❌ ${tradeDate} ${code}:`, err.message);
                }
            }
        }
    }

    return results;
}

// CSV로 저장
function saveToCsv(data) {
    if (!data.length) return;

    const today = dayjs().format("YYYYMMDD");
    const fileName = `etf_prices_${today}.csv`;
    const outputDir = path.join(__dirname, "output");
    const filePath = path.join(outputDir, fileName);

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    const header = Object.keys(data[0]).join(",");
    const rows = data.map((row) => Object.values(row).join(","));
    const csv = [header, ...rows].join("\n");

    fs.writeFileSync(filePath, csv, "utf8");
    console.log(`[완료] CSV 저장됨: ${filePath}`);
}

// 직접 실행
(async () => {
    const etfCodes = await fetchEtfCodesArray();

    // 테스트용 10개
    // const data = await collectEtfPricesFromCodes(etfCodes.slice(0, 10));

    // 3년치 전체 데이터 조회
    const startDate = "2022-07-11";
    const endDate = dayjs().format("YYYY-MM-DD");
    const data = await collectEtfPricesFromCodes(etfCodes, startDate, endDate);

    saveToCsv(data);

    // JSON 파일로 저장
    // const today = dayjs().format("YYYYMMDD");
    // const jsonFileName = `etf_prices_3years_${today}.json`;
    // const jsonFilePath = path.join(__dirname, "output", jsonFileName);

    // if (!fs.existsSync(path.dirname(jsonFilePath))) {
    //     fs.mkdirSync(path.dirname(jsonFilePath), { recursive: true });
    // }

    fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2), "utf8");
    console.log(`[완료] JSON 저장됨: ${jsonFilePath}`);
})();
