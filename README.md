# EasyToFind Backend - ETF 상세 페이지 API

## 개요

이 프로젝트는 ETF 데이터를 수집하고 상세 정보를 제공하는 백엔드 API입니다.

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 설정

`.env` 파일을 생성하고 데이터베이스 연결 정보를 설정하세요:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password
```

### 3. CSV 데이터를 데이터베이스로 가져오기

```bash
npm run import-csv
```

### 4. 서버 실행

```bash
npm start
```

## API 엔드포인트

### ETF 상세 정보 조회

```
GET /api/etfs/{etfCode}
```

**응답 예시:**

```json
{
  "status": 200,
  "message": "조회 성공",
  "data": {
    "etf_code": "069500",
    "etf_name": "ETF_069500",
    "fund_type": "Stock ETF",
    "benchmark": "KOSPI 200",
    "expense_ratio": 0.05,
    "inception_date": "2020-01-01",
    "fund_size": 1000000000,
    "issuer": "Unknown",
    "recentPrices": [
      {
        "trade_date": "2024-01-01",
        "open_price": 50000,
        "high_price": 51000,
        "low_price": 49000,
        "close_price": 50500,
        "volume": 1000000,
        "nav_price": 505.50,
        "change_rate": 1.0,
        "aum": 1000000000
      }
    ],
    "performance": {
      "1y": {
        "start_date": "2023-01-01",
        "end_date": "2024-01-01",
        "current_price": 50500,
        "start_price": 45000,
        "total_return_percent": 12.22,
        "max_gain_percent": 15.00,
        "max_loss_percent": -5.00,
        "avg_volume": 1200000,
        "trading_days": 250
      },
      "3y": { ... },
      "5y": { ... }
    }
  }
}
```

## 데이터베이스 스키마

### ETF 테이블

- `id`: 기본키
- `etf_code`: ETF 코드 (고유)
- `etf_name`: ETF 이름
- `fund_type`: 펀드 유형
- `benchmark`: 벤치마크
- `expense_ratio`: 총보수율
- `inception_date`: 설립일
- `fund_size`: 펀드 규모
- `issuer`: 발행사

### ETF_PRICES 테이블

- `id`: 기본키
- `trade_date`: 거래일
- `etf_code`: ETF 코드
- `open_price`: 시가
- `high_price`: 고가
- `low_price`: 저가
- `close_price`: 종가
- `volume`: 거래량
- `nav_price`: NAV
- `change_rate`: 등락률
- `aum`: 자산규모

## 사용 예시

### Frontend에서 API 호출

```javascript
// ETF 상세 정보 가져오기
const response = await fetch("/api/etfs/069500");
const data = await response.json();

if (data.status === 200) {
  const etfDetail = data.data;
  console.log("ETF 이름:", etfDetail.etf_name);
  console.log(
    "현재가:",
    etfDetail.recentPrices[etfDetail.recentPrices.length - 1].close_price
  );
  console.log("1년 수익률:", etfDetail.performance["1y"].total_return_percent);
}
```

## 주의사항

- CSV 데이터를 먼저 데이터베이스로 가져와야 API가 정상 작동합니다.
- ETF 코드는 실제 상장된 ETF 코드를 사용해야 합니다.
- 성과 지표는 최근 거래 데이터를 기반으로 계산됩니다.
