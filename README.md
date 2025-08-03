# 📈 ETF: Easy To Find
ETF의 모든 것, Easy To Find에서 쉽고 간편하게<br>
찾고, 비교하고, 추천받고, 직접 시뮬레이션 해보는 과정을 통해<br>
단순한 추천을 넘어, ETF 선택의 기준을 재정의합니다.
<br><br><br>

## 프로젝트 개요

### 기획 의도
**1000개가 넘는 ETF 중에서, 어떤 ETF를, 어떻게 골라야 할까요?**

Easy To Find는 투자 판단까지 걸리는 복잡한 고민의 시간을 줄일 수 있도록 돕는<br>
개인화 기반 ETF 탐색·추천·시뮬레이션 플랫폼입니다.
<br><br>

### 개발 기간
2025.07.03 - 2025.07.29
<br><br>

### 팀 소개

| <img src="https://github.com/todayiswindy.png" width="460px"/> | <img src="https://github.com/slay1379.png" width="460px"/> | <img src="https://github.com/hiwonwon.png" width="460px"/> | <img src="https://github.com/Dayoung331.png" width="460px"/> |
|:----------------------:|:-------------------:|:------------------------:|:---------------------------:|
| **김지연**               | **김태헌**            | **박혜원**               | **정다영**                   |
| [@todayiswindy](http://github.com/todayiswindy)               | [@slay1379](http://github.com/slay1379)            | [@hiwonwon](http://github.com/hiwonwon)               | [@Dayoung331](http://github.com/Dayoung331)                   |
| PM / FE / BE    | FE / BE            | FE / BE            | FE / BE / Infra                  |
| 상세 페이지,<br>메인 페이지 | 시뮬레이션 로직,<br>시뮬레이션 / 결과 페이지 | 스코어링 로직,<br>성향 테스트 / 결과 페이지 | 탐색 / 비교 페이지,<br>마이페이지, 배포       |

<br><br>
## 사용 기술 및 도구

### Frontend
- `JavaScript`
- `React`
- `Tailwind CSS` / `CSS-in-JS`
- `Shadcn`
- `Lightweight charts`

### Backend
- `Node.js`
- `AWS RDS`
- `PostgreSQL`
- `JWT` 기반 인증 및 사용자 세션 관리

### Infra / DevOps
- `AWS EC2` (Ubuntu + PM2 + Nginx + GitHub Actions)
- `GitHub Actions` (CI/CD 자동 배포)

### 협업 도구
- `GitHub` (버전 관리)
- `Notion` (기획 및 일정 공유)
- `Figma` (UI/UX 설계)

### API
- 한국투자증권 API
- KRX
- ETF check

<br><br>

## 주요 기능 소개

| **기능 및 로직 구분** | **상세 설명** |
|:-----------:|-----------|
| ETF 탐색 | 상품명 뿐만 아니라 종목명으로도 검색 가능, 유형별·테마별·종목별로 분류해 확인 가능 |
| ETF 비교 | 최대 5개의 ETF를 동시에 비교 가능, 사용자별 종합 점수와 다양한 지표를 한눈에 확인 가능 |
| 맞춤 추천 | 단순한 리스크 기반 추천을 넘어 사용자별 가중치 알고리즘으로 산출된 맞춤형 ETF 추천 |
| 스코어링 로직 | 지표를 더 다양화하여 기존 5개이던 투자자 유형을 10개 유형으로 확장 |
| 시뮬레이터 | 정량적 분석 리포트 제공, 목표 달성률 제시, 투자 성향과 리스크 허용도를 반영한 개인화 점수 + 리스크 점수 = 종합 점수 제공,<br>가장 적합한 상위 ETF 리스트 추천 |
| 시뮬레이션 로직 | Monte-Carlo 시뮬레이션 도입, 총 5000개의 시나리오를 바탕으로 예상 가치의 변동 범위를 시각화하여<br>사용자에게 현실적인 투자 기대 범위를 직관적으로 전달 |
| 마이페이지 | 관심 있는 ETF 목록을 기간별로 확인할 수 있도록 구성 |

<br><br>

## 실행 화면
       <img width="1889" height="1105" alt=
| **목록** | **실행 화면** |
|:-----------:|-----------|
| 메인 화면 | <img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 39 01" src="https://github.com/user-attachments/assets/e37d3d5c-480a-40c4-a2c9-0777e56cd8ec" /><img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 39 24" src="https://github.com/user-attachments/assets/4efe5435-f671-447f-a602-8f9ea6fefdf5" /><br><img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 39 27" src="https://github.com/user-attachments/assets/4377d295-f865-4724-badd-d21a4395d3d1" /> |
| 회원가입 / 로그인 | <img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 46 06" src="https://github.com/user-attachments/assets/7304a16c-238a-43fe-ae51-dc2d467c6a32" /><img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 46 10" src="https://github.com/user-attachments/assets/0d8c4b2e-3932-4268-822c-06cd89594bd1" /> |
| ETF 탐색 페이지 | <img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 40 09" src="https://github.com/user-attachments/assets/80d45736-4361-49e3-a030-f3c843286040" />|
| ETF 비교 페이지 | <img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 45 08" src="https://github.com/user-attachments/assets/f079e791-cd98-4a9d-a4c5-bee69e04d4e4" /><img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 45 23" src="https://github.com/user-attachments/assets/f7eabb4c-b559-4946-a267-d14e24feac3b" /> |
| ETF 상세 페이지 | <img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 41 03" src="https://github.com/user-attachments/assets/b568cdc2-b7bf-46b8-9e0e-67212e24e34a" /><img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 41 06" src="https://github.com/user-attachments/assets/2f15edb3-8859-4b2f-a28b-f847003893bb" /><br><img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 41 10" src="https://github.com/user-attachments/assets/ef09f5c6-1993-4f81-9050-5ac422754a57" /><img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 41 15" src="https://github.com/user-attachments/assets/be9f4aed-ceda-4030-a09a-448e0112248e" /><br><img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 41 19" src="https://github.com/user-attachments/assets/63062d05-eaa3-4e3a-ac84-3ae92b08ce0c" /><img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 41 25" src="https://github.com/user-attachments/assets/1dfff5ba-faa6-4ac2-98f7-2d1e46e64b60" /> |
| 맞춤 추천 페이지 | <img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 42 03" src="https://github.com/user-attachments/assets/eb8de90b-9514-415d-8529-e2bbf40281b7" /><img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 42 06" src="https://github.com/user-attachments/assets/143928de-6b2c-40e8-9d5b-84f4708b21ae" /><br><img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 42 09" src="https://github.com/user-attachments/assets/3d3f4e75-e826-43fa-97a1-872e4d7beeaf" /> |
| 맞춤 추천 결과 페이지 | <img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 42 37" src="https://github.com/user-attachments/assets/cb85a8bf-5d94-4d14-9b8e-d047c6976c87" /><img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 42 39" src="https://github.com/user-attachments/assets/2ee87f5d-9689-4c50-a327-801d7219db4f" /> |
| 시뮬레이터 | <img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 42 45" src="https://github.com/user-attachments/assets/ca972ce3-1de6-4ff4-b35c-b554fe6b9977" /><img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 43 00" src="https://github.com/user-attachments/assets/cbf3d938-8e91-4cc8-ac83-613f7fc64bf1" /> |
| 시뮬레이터 결과 페이지 | <img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 43 27" src="https://github.com/user-attachments/assets/2ac4be07-2113-4ccd-a526-eda495933c32" /><img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 43 31" src="https://github.com/user-attachments/assets/68068159-6262-4aa1-8289-59037ba5838d" /><br><img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 43 42" src="https://github.com/user-attachments/assets/298c85b5-907e-47b0-8b69-30ac7236447f" /><img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 43 46" src="https://github.com/user-attachments/assets/eefc0458-3032-485e-b30c-57cb20d9741e" /> |
| 마이페이지 | <img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 45 46" src="https://github.com/user-attachments/assets/ad8a30d9-3425-43a1-829e-5d8b35f98c8f" /><img width="400" height="300" alt="스크린샷 2025-07-29 오후 4 45 50" src="https://github.com/user-attachments/assets/28c4ef70-fdcc-4522-bd6e-7956c3b5f708" /> |

<br><br>

## ERD
<img width="1250" height="760" alt="스크린샷 2025-08-03 오후 8 52 08" src="https://github.com/user-attachments/assets/fd6f1446-db77-491c-bb07-cde850d9f5f7" />

<br><br>

## API 명세서
<img width="1035" height="726" alt="스크린샷 2025-08-03 오후 8 54 39" src="https://github.com/user-attachments/assets/09f20f50-a688-4d0b-9071-0afaa55b5e4e" />

<br><br>

## Figma
<img width="1010" height="710" alt="스크린샷 2025-08-03 오후 8 55 39" src="https://github.com/user-attachments/assets/09602c04-5c3e-459e-a4f4-a4b34a8308db" />

<br><br>

## 아키텍처 구성
<img width="1316" height="615" alt="image" src="https://github.com/user-attachments/assets/ee70afe3-dfbc-45f9-a787-5044b4c38449" />

<br><br>

## 구성도
```bash
/
├── 회원가입 및 로그인
│   ├── 이메일 기반 회원가입 / 로그인
│   └── 약관 및 개인정보 수집 동의
│
├── /
│   ├── ETF 탐색 배너
│   │   ├── 상품명 / 종목명으로 ETF 검색
│   │   └── /find 페이지로 이동
│   │
│   ├── ETF 트렌드 한눈에 보기
│   │   ├── 순자산 / 수익률 / 누적 거래량 을 바탕으로 TOP5 ETF 목록 확인 가능
│   │   └── 전체 운용상품 보러 가기 버튼 클릭 시 /find 로 이동
│   │
│   └── 하단 메뉴 버튼
│       ├── What's your ETF? 클릭 시 /me/mbti 로 이동
│       └── 전략 시뮬레이션 클릭 시 /goal 로 이동
│
├── /find
│   ├── ETF 탐색
│   │   ├── 상품명 / 종목명으로 ETF 검색
│   │   ├── 여러 탭 버튼을 클릭해 원하는 유형 / 테마로 검색 가능
│   │   ├── ETF별 / 종목별 sorting 기능 제공
│   │   ├── 유형별 / 테마별 / 관심별 로 분류된 결과 확인
│   │   └── 각 ETF 클릭 시 상세 페이지로 이동 (/etfs/{종목코드})
│   │
│   └── ETF 비교
│       ├── 체크 박스를 선택한 후 비교하기 버튼을 클릭하면 팝업창 뜸
│       ├── 최대 5개의 ETF 비교 가능
│       └── 종합점수, 핵심 지표, 기간별 수익률을 한눈에 파악 가능
│
├── /etfs/{종목코드}
│   └── 상세 페이지
│       ├── 상품정보, 수익률, 위험도, 기준가, 구성종목 정보를 세세하게 확인 가능
│       ├── 수익률은 기간별 그래프를 함께 제공
│       ├── 위험도는 투자위험도, 최대낙폭, 변동성 그래프를 함께 제공
│       └── 구성종목은 구성 비율 그래프와 상세 목록 제공
│
├── /me/mbti
│   ├── 맞춤 추천
│   │   └── 투자 성향 + 관심 테마 기반 질문
│   │
│   └── 맞춤 추천 결과 페이지
│       ├── 개인화 점수를 반영한 ETF 추천 리스트 제공
│       └── 안정성, 유동성, 성장도, 분산도 지표 제공
│
├── /goal
│   └── 시뮬레이터
│       ├── 목표 금액, 기간, 초기금액, 월 적립 입력
│       ├── 수익률 기반 달성 가능성 예측
│       ├── 몬테카를로 기반 가치 예측 그래프 시각화
│       └── 종합 점수 기반 최적 ETF 리스트 제공
│
├── /mypage
│   ├── 내 투자 성향 / 관심 테마 확인
│   └── 저장한 ETF 확인 (기간별 수익률)
│
└── Cf) 사용자 흐름 요약
    ├── 1단계: 회원가입 / 로그인
    ├── 2단계: ETF 탐색 or 맞춤 추천 or 시뮬레이터 이용
    ├── 3단계: ETF 탐색 / 비교 및 관심 ETF 저장 or 추천 결과 확인 or 결과 리포트 확인
    └── 4단계: /mypage에서 나의 관심 ETF 확인 및 관리
```
