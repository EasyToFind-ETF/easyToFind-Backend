const fs = require("fs");
const axios = require("axios");
const dayjs = require("dayjs");
const { createObjectCsvWriter } = require("csv-writer");
const pool = require("../common/database");

// p-limit import 방식 변경
let pLimit;
try {
  pLimit = require("p-limit");
} catch (error) {
  console.warn(
    "[WARN] p-limit 패키지를 불러올 수 없습니다. 기본 병렬 처리를 사용합니다."
  );
  pLimit = (concurrency) => {
    const queue = [];
    let running = 0;

    const run = async (fn) => {
      running++;
      try {
        return await fn();
      } finally {
        running--;
        if (queue.length > 0) {
          queue.shift()();
        }
      }
    };

    return (fn) => {
      return new Promise((resolve, reject) => {
        const execute = () => {
          if (running < concurrency) {
            run(fn).then(resolve).catch(reject);
          } else {
            queue.push(execute);
          }
        };
        execute();
      });
    };
  };
}

// pLimit이 함수가 아닌 경우를 위한 추가 처리
if (typeof pLimit !== "function") {
  console.warn(
    "[WARN] p-limit이 함수가 아닙니다. 기본 병렬 처리를 사용합니다."
  );
  pLimit = (concurrency) => {
    const queue = [];
    let running = 0;

    const run = async (fn) => {
      running++;
      try {
        return await fn();
      } finally {
        running--;
        if (queue.length > 0) {
          queue.shift()();
        }
      }
    };

    return (fn) => {
      return new Promise((resolve, reject) => {
        const execute = () => {
          if (running < concurrency) {
            run(fn).then(resolve).catch(reject);
          } else {
            queue.push(execute);
          }
        };
        execute();
      });
    };
  };
}

/* ────────── 유틸리티 함수 ────────── */
function readCodesFromCsv(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    return fileContent
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/"/g, ""))
      .filter(Boolean)
      .filter((line) => !isNaN(parseInt(line, 10)));
  } catch (error) {
    console.error(`[ERROR] '${filePath}' 파일을 읽을 수 없습니다.`);
    return [];
  }
}

// 데이터베이스에서 ETF 코드 가져오기
async function getEtfCodesFromDatabase() {
  try {
    const client = await pool.connect();
    const result = await client.query(
      "SELECT etf_code FROM etfs ORDER BY etf_code"
    );
    client.release();
    return result.rows.map((row) => row.etf_code);
  } catch (error) {
    console.error(
      "[ERROR] 데이터베이스에서 ETF 코드를 가져오는데 실패했습니다:",
      error
    );
    return [];
  }
}

// ETF 코드 파일 생성
async function createEtfCodeFile() {
  const codes = await getEtfCodesFromDatabase();
  if (codes.length === 0) {
    console.error("[ERROR] 데이터베이스에서 ETF 코드를 가져올 수 없습니다.");
    return false;
  }

  const content = codes.join("\n");
  fs.writeFileSync("etf_code_only.csv", content, "utf8");
  console.log(
    `[INFO] ${codes.length}개의 ETF 코드로 etf_code_only.csv 파일을 생성했습니다.`
  );
  return true;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ────────── checkclient 키 생성 함수 ────────── */
async function calcCheckclient() {
  const n = "4lm@flEh68";
  const minuteStamp = Math.floor(Date.now() / 60_000).toString();
  let r = "";
  for (const digit of minuteStamp) {
    r += n[parseInt(digit, 10)];
  }
  const bytes = new TextEncoder().encode(r);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ────────── ETFCheck API 호출 (ref_date에 현재 시간 적용) ────────── */
async function fetchHoldings(etfCode, now, retryCount = 0) {
  const url = `https://www.etfcheck.co.kr/user/etp/getEtfPdfRankListWeight?code=${etfCode}&start=0&limit=1000`;
  const clinetKey = await calcCheckclient();

  try {
    const { data } = await axios.get(url, {
      headers: {
        accept: "application/json, text/plain, */*",
        authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InBhbGdhbG93QGdtYWlsLmNvbSIsImlhdCI6MTc1MjQ1MDg5M30.k1s6I9y1Ygd7Kd5Fsj7IPshefZX8NOvVnQwgP9gK8gQ",
        cookie:
          "connect.sid=s%3A5v5vU9yMhSmY_Bq14Tz2H0kH5DgrA-yJ.oG2z7zL%2FKiG4JNdop4MwbkYh4WHePvkpT4t3Wb5aPqI; _ga=GA1.1.523024541.1752103715; _ga_8W6PNHQZTR=GS2.1.s1752453489$o11$g1$t1752455852$j59$l0$h0",
        checkclient: clinetKey,
        Referer: `https://www.etfcheck.co.kr/mobile/etpitem/${etfCode}/compose`,
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      },
      timeout: 30000, // 30초로 증가
    });

    const list = data?.results;
    if (!Array.isArray(list) || list.length === 0) {
      console.warn(`[WARN] ${etfCode} – 구성종목 데이터가 없습니다.`);
      return [];
    }

    return list
      .filter((d) => d && d.F16004 && d.WEIGHT)
      .map((d) => ({
        etf_code: etfCode,
        weight_pct: parseFloat(d.WEIGHT ?? "0"),
        // ✅ [수정된 부분] API의 날짜와 현재 시간을 조합
        ref_date: d.F12506
          ? `${dayjs(d.F12506, "YYYYMMDD").format(
              "YYYY-MM-DD"
            )} ${now.substring(11)}`
          : now,
        update_at: now,
      }));
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.code === "ECONNABORTED") {
        console.error(`[ERROR] ${etfCode} - 요청 시간 초과 (Timeout)`);
      } else if (err.response) {
        console.error(
          `[ERROR] ${etfCode} - ${err.response.status} 에러. 토큰 만료 또는 잘못된 요청일 수 있습니다.`
        );
      } else if (
        err.code === "ECONNRESET" ||
        err.message.includes("socket hang up")
      ) {
        console.error(
          `[ERROR] ${etfCode} - 네트워크 연결 끊김 (socket hang up)`
        );
      } else {
        console.error(`[ERROR] ${etfCode} - 네트워크 에러: ${err.message}`);
      }
    } else {
      console.error(`[ERROR] ${etfCode} - 알 수 없는 에러:`, err);
    }

    // 재시도 로직 (최대 3회)
    if (retryCount < 3) {
      console.log(`[RETRY] ${etfCode} 재시도 중... (${retryCount + 1}/3)`);
      await sleep(2000 + Math.random() * 3000); // 2-5초 랜덤 대기
      return fetchHoldings(etfCode, now, retryCount + 1);
    }

    return [];
  }
}

/* ────────── 여러 ETF 병렬 수집 ────────── */
async function collect(codes, now) {
  const limit = pLimit(2); // 병렬 처리 수를 2개로 줄임
  const rows = [];
  const failedCodes = [];

  await Promise.all(
    codes.map((code, i) =>
      limit(async () => {
        // 요청 간격 추가 (1초)
        if (i > 0) {
          await sleep(1000);
        }

        console.log(`[INFO] (${i + 1}/${codes.length}) ${code} 수집 시작...`);
        const list = await fetchHoldings(code, now);

        if (list.length === 0) {
          failedCodes.push(code);
        } else {
          list.forEach((r) => {
            rows.push(r);
          });
        }
      })
    )
  );

  if (failedCodes.length > 0) {
    console.warn(
      `⚠️ ${failedCodes.length}개 ETF 수집 실패: ${failedCodes.join(", ")}`
    );
  }

  return rows;
}

/* ────────── 데이터베이스 저장 ────────── */
async function saveToDatabase(rows) {
  if (rows.length === 0) {
    console.log("저장할 데이터가 없습니다.");
    return;
  }

  const client = await pool.connect();
  try {
    console.log(
      `💾 ${rows.length}개 구성종목 데이터를 데이터베이스에 저장 중...`
    );

    // 트랜잭션 시작
    await client.query("BEGIN");

    // 테이블 구조 확인
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'etf_holdings' 
      ORDER BY ordinal_position;
    `);
    console.log("📋 etf_holdings 테이블 구조:");
    tableInfo.rows.forEach((row) => {
      console.log(
        `   ${row.column_name}: ${row.data_type} ${
          row.is_nullable === "YES" ? "NULL" : "NOT NULL"
        } ${row.column_default ? `DEFAULT ${row.column_default}` : ""}`
      );
    });

    // 기존 데이터 삭제 (오늘 날짜의 데이터만)
    const today = dayjs().format("YYYY-MM-DD");
    await client.query("DELETE FROM etf_holdings WHERE DATE(update_at) = $1", [
      today,
    ]);
    console.log(`🗑️ 기존 ${today} 데이터 삭제 완료`);

    // holdings_id 수동 생성 (연속된 ID 보장)
    const rowsWithId = rows.map((row, index) => ({
      ...row,
      holdings_id: index + 1,
    }));

    // 배치 삽입을 위한 쿼리
    const insertQuery = `
      INSERT INTO etf_holdings (
        holdings_id, etf_code, weight_pct, ver, update_at
      ) VALUES ($1, $2, $3, $4, $5)
    `;

    // 배치 처리 (500개씩 줄임)
    const batchSize = 500;
    for (let i = 0; i < rowsWithId.length; i += batchSize) {
      const batch = rowsWithId.slice(i, i + batchSize);
      const batchPromises = batch.map((row) =>
        client.query(insertQuery, [
          row.holdings_id,
          row.etf_code,
          row.weight_pct,
          dayjs().year(),
          row.update_at,
        ])
      );

      await Promise.all(batchPromises);
      console.log(
        `✅ ${Math.min(i + batchSize, rowsWithId.length)}/${
          rowsWithId.length
        }개 데이터 저장 완료`
      );
    }

    // 트랜잭션 커밋
    await client.query("COMMIT");
    console.log(
      `🎉 총 ${rowsWithId.length}개 구성종목 데이터베이스 저장 완료!`
    );
  } catch (error) {
    // 트랜잭션 롤백
    await client.query("ROLLBACK");
    console.error("❌ 데이터베이스 저장 실패:", error.message);
    throw error;
  } finally {
    client.release();
  }
}

/* ────────── ETF 구성종목 데이터 수집 함수 ────────── */
async function collectEtfHoldings() {
  const now = dayjs().format("YYYY-MM-DD HH:mm");
  let targets = readCodesFromCsv("etf_code_only.csv");

  // 파일이 없거나 비어있으면 데이터베이스에서 생성
  if (targets.length === 0) {
    console.log(
      "❗ 'etf_code_only.csv' 파일이 없습니다. 데이터베이스에서 ETF 코드를 가져와 파일을 생성합니다."
    );
    const success = await createEtfCodeFile();
    if (!success) {
      console.error("❌ ETF 코드 파일 생성에 실패했습니다.");
      return;
    }
    targets = readCodesFromCsv("etf_code_only.csv");
  }

  if (targets.length === 0) {
    console.log("❗ 처리할 대상 코드가 없습니다.");
    return;
  }

  // 🚀 전체 수집
  console.log("[MODE: FULL] 🚀 ETF 구성종목 수집을 시작합니다.");
  console.log(`[INFO] 총 ${targets.length}개 종목에 대한 크롤링을 시작합니다.`);

  const allRows = await collect(targets, now);

  // CSV 대신 데이터베이스에 저장
  await saveToDatabase(allRows);
  console.log(`\n=== 수집 완료 ===`);
  console.log(`총 ${allRows.length}개 구성종목 데이터 수집 및 DB 저장 완료`);
}

// 함수 export
module.exports = collectEtfHoldings;
