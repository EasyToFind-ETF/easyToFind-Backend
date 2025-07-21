const axios = require("axios");
const fs = require("fs");
const path = require("path");
const dayjs = require("dayjs");
const readline = require("readline");
require("dotenv").config();

const APP_KEY = process.env.KI_APP_KEY;
const APP_SECRET = process.env.KI_APP_SECRET;
const BASE_URL = "https://openapi.koreainvestment.com:9443";
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

// CSV 파일에서 종목코드 추출
async function readEtfCodesFromCsv(filePath) {
    const stream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: stream });
    const codes = [];

    let isFirst = true;
    for await (const line of rl) {
        if (isFirst) {
            isFirst = false; // 첫 줄은 헤더로 간주하고 스킵
            continue;
        }
        const [code] = line.split(",");
        if (code && code.length >= 5) codes.push(code.trim());
    }

    return codes;
}

// ETF 시세 조회
async function getEtfPrice(etfCode, token) {
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
async function collectEtfPricesFromCsv(filePath) {
    // const token = await getAccessToken();

    // 전체 데이터 받아오기
    // const etfCodes = await readEtfCodesFromCsv(filePath);

    // 상위 10개만 테스트
    let etfCodes = await readEtfCodesFromCsv(filePath);
    etfCodes = etfCodes.slice(0, 10);

    const today = dayjs().format("YYYYMMDD");
    const results = [];

    console.log(`[INFO] 총 ${etfCodes.length}개 종목에 대해 시세 수집 시작`);

    for (let i = 0; i < etfCodes.length; i++) {
        const code = etfCodes[i];

        try {
            const data = await getEtfPrice(code, token);
            const row = {
                trade_date: today,
                etf_code: code,
                open_price: parseInt(data.stck_oprc || 0),
                high_price: parseInt(data.stck_hgpr || 0),
                low_price: parseInt(data.stck_lwpr || 0),
                close_price: parseInt(data.stck_prpr || 0),
                volume: parseInt(data.acml_vol || 0),
                nav_price: parseFloat(data.nav || 0),
                change_rate: parseFloat(data.prdy_ctrt || 0),
                aum: parseInt(data.etf_ntas_ttam || 0),
            };
            results.push(row);
            console.log(`[${i + 1}/${etfCodes.length}] ✅ ${code} 완료`);
            await new Promise((r) => setTimeout(r, 500));
        } catch (err) {
            if (err.response) {
                console.error(`[${i + 1}/${etfCodes.length}] ❌ ${code} 실패:`, err.response.status, err.response.data);
            } else {
                console.error(`[${i + 1}/${etfCodes.length}] ❌ ${code} 실패:`, err.message);
            }
        }
    }

    return results;
}

// CSV로 저장
function saveToCsv(data) {
    if (!data.length) return null;

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

    return filePath;
}

// 직접 실행 시
if (require.main === module) {
    const inputCsvPath = process.argv[2] || path.join(__dirname, "data_2717_20250710.csv");

    (async () => {
        const data = await collectEtfPricesFromCsv(inputCsvPath);
        const savedFilePath = saveToCsv(data);
    })();
}
